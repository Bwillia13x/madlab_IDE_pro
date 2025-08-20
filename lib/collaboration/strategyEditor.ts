import { EventEmitter } from 'events';

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName: string;
  color: string;
  timestamp: number;
}

interface DocumentChange {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  operation: 'insert' | 'delete' | 'replace';
  position: number;
  content?: string;
  length?: number;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  position: number;
  content: string;
  replies: Comment[];
  resolved: boolean;
}

interface StrategyDocument {
  id: string;
  title: string;
  content: string;
  version: number;
  lastModified: Date;
  collaborators: string[];
  comments: Comment[];
  cursors: Map<string, CursorPosition>;
}

export class CollaborativeStrategyEditor extends EventEmitter {
  private documents: Map<string, StrategyDocument> = new Map();
  private userSessions: Map<string, { userId: string; documentId: string; lastActivity: Date }> = new Map();
  private changeHistory: Map<string, DocumentChange[]> = new Map();
  private operationalTransforms: Map<string, DocumentChange[]> = new Map();

  constructor() {
    super();
  }

  /**
   * Create a new strategy document
   */
  async createDocument(title: string, initialContent: string, creatorId: string): Promise<string> {
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const document: StrategyDocument = {
      id: documentId,
      title,
      content: initialContent,
      version: 1,
      lastModified: new Date(),
      collaborators: [creatorId],
      comments: [],
      cursors: new Map()
    };

    this.documents.set(documentId, document);
    this.changeHistory.set(documentId, []);
    this.operationalTransforms.set(documentId, []);

    this.emit('documentCreated', { documentId, title, creatorId });
    return documentId;
  }

  /**
   * Join a document for collaborative editing
   */
  async joinDocument(documentId: string, userId: string, userName: string): Promise<boolean> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Add user to collaborators if not already present
    if (!document.collaborators.includes(userId)) {
      document.collaborators.push(userId);
    }

    // Create user session
    this.userSessions.set(userId, {
      userId,
      documentId,
      lastActivity: new Date()
    });

    // Notify other users
    this.emit('userJoined', { documentId, userId, userName });

    return true;
  }

  /**
   * Leave a document
   */
  async leaveDocument(documentId: string, userId: string): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) return;

    // Remove user session
    this.userSessions.delete(userId);

    // Remove user cursor
    document.cursors.delete(userId);

    // Notify other users
    this.emit('userLeft', { documentId, userId });
  }

  /**
   * Update cursor position
   */
  async updateCursor(documentId: string, userId: string, userName: string, x: number, y: number): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) return;

    const cursor: CursorPosition = {
      x,
      y,
      userId,
      userName,
      color: this.getUserColor(userId),
      timestamp: Date.now()
    };

    document.cursors.set(userId, cursor);

    // Broadcast cursor update to other users
    this.emit('cursorUpdated', { documentId, cursor });
  }

  /**
   * Insert text at position
   */
  async insertText(documentId: string, userId: string, position: number, content: string): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) return;

    const change: DocumentChange = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName: this.getUserName(userId),
      timestamp: Date.now(),
      operation: 'insert',
      position,
      content
    };

    // Apply operational transform
    const transformedChange = this.applyOperationalTransform(documentId, change);
    
    // Apply change to document
    this.applyChange(document, transformedChange);

    // Store in history
    this.changeHistory.get(documentId)?.push(transformedChange);

    // Increment version
    document.version++;
    document.lastModified = new Date();

    // Broadcast change to other users
    this.emit('documentChanged', { documentId, change: transformedChange });
  }

  /**
   * Delete text at position
   */
  async deleteText(documentId: string, userId: string, position: number, length: number): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) return;

    const change: DocumentChange = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName: this.getUserName(userId),
      timestamp: Date.now(),
      operation: 'delete',
      position,
      length
    };

    // Apply operational transform
    const transformedChange = this.applyOperationalTransform(documentId, change);
    
    // Apply change to document
    this.applyChange(document, transformedChange);

    // Store in history
    this.changeHistory.get(documentId)?.push(transformedChange);

    // Increment version
    document.version++;
    document.lastModified = new Date();

    // Broadcast change to other users
    this.emit('documentChanged', { documentId, change: transformedChange });
  }

  /**
   * Replace text at position
   */
  async replaceText(documentId: string, userId: string, position: number, content: string, length: number): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) return;

    const change: DocumentChange = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName: this.getUserName(userId),
      timestamp: Date.now(),
      operation: 'replace',
      position,
      content,
      length
    };

    // Apply operational transform
    const transformedChange = this.applyOperationalTransform(documentId, change);
    
    // Apply change to document
    this.applyChange(document, transformedChange);

    // Store in history
    this.changeHistory.get(documentId)?.push(transformedChange);

    // Increment version
    document.version++;
    document.lastModified = new Date();

    // Broadcast change to other users
    this.emit('documentChanged', { documentId, change: transformedChange });
  }

  /**
   * Add a comment to the document
   */
  async addComment(documentId: string, userId: string, position: number, content: string): Promise<string> {
    const document = this.documents.get(documentId);
    if (!document) throw new Error('Document not found');

    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName: this.getUserName(userId),
      timestamp: Date.now(),
      position,
      content,
      replies: [],
      resolved: false
    };

    document.comments.push(comment);

    // Broadcast comment to other users
    this.emit('commentAdded', { documentId, comment });

    return comment.id;
  }

  /**
   * Reply to a comment
   */
  async replyToComment(documentId: string, commentId: string, userId: string, content: string): Promise<string> {
    const document = this.documents.get(documentId);
    if (!document) throw new Error('Document not found');

    const comment = document.comments.find(c => c.id === commentId);
    if (!comment) throw new Error('Comment not found');

    const reply: Comment = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName: this.getUserName(userId),
      timestamp: Date.now(),
      position: comment.position,
      content,
      replies: [],
      resolved: false
    };

    comment.replies.push(reply);

    // Broadcast reply to other users
    this.emit('commentReplied', { documentId, commentId, reply });

    return reply.id;
  }

  /**
   * Resolve a comment
   */
  async resolveComment(documentId: string, commentId: string, _userId: string): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) throw new Error('Document not found');

    const comment = document.comments.find(c => c.id === commentId);
    if (!comment) throw new Error('Comment not found');

    comment.resolved = true;

    // Broadcast comment resolution to other users
    this.emit('commentResolved', { documentId, commentId, userId: _userId });
  }

  /**
   * Get document content
   */
  async getDocument(documentId: string): Promise<StrategyDocument | null> {
    return this.documents.get(documentId) || null;
  }

  /**
   * Get document version
   */
  async getDocumentVersion(documentId: string): Promise<number> {
    const document = this.documents.get(documentId);
    return document?.version || 0;
  }

  /**
   * Get active cursors for a document
   */
  async getActiveCursors(documentId: string): Promise<CursorPosition[]> {
    const document = this.documents.get(documentId);
    if (!document) return [];

    const now = Date.now();
    const activeCursors: CursorPosition[] = [];

    document.cursors.forEach((cursor, _userId) => {
      // Only show cursors active in the last 30 seconds
      if (now - cursor.timestamp < 30000) {
        activeCursors.push(cursor);
      }
    });

    return activeCursors;
  }

  /**
   * Get document change history
   */
  async getChangeHistory(documentId: string): Promise<DocumentChange[]> {
    return this.changeHistory.get(documentId) || [];
  }

  /**
   * Apply operational transform to resolve conflicts
   */
  private applyOperationalTransform(documentId: string, change: DocumentChange): DocumentChange {
    const transforms = this.operationalTransforms.get(documentId) || [];
    let transformedChange = { ...change };

    // Apply existing transforms to the new change
    for (const transform of transforms) {
      transformedChange = this.transformChange(transformedChange, transform);
    }

    // Add the new change to transforms
    transforms.push(transformedChange);
    this.operationalTransforms.set(documentId, transforms);

    return transformedChange;
  }

  /**
   * Transform a change based on another change
   */
  private transformChange(change: DocumentChange, otherChange: DocumentChange): DocumentChange {
    // Simple conflict resolution - if changes are at the same position, 
    // the later change wins
    if (change.position === otherChange.position && 
        change.operation === otherChange.operation &&
        change.timestamp < otherChange.timestamp) {
      
      if (change.operation === 'insert') {
        return {
          ...change,
          position: change.position + (otherChange.content?.length || 0)
        };
      } else if (change.operation === 'delete') {
        return {
          ...change,
          position: change.position + (otherChange.content?.length || 0)
        };
      }
    }

    // If other change is before this change, adjust position
    if (otherChange.position < change.position) {
      if (otherChange.operation === 'insert') {
        return {
          ...change,
          position: change.position + (otherChange.content?.length || 0)
        };
      } else if (otherChange.operation === 'delete') {
        return {
          ...change,
          position: Math.max(0, change.position - (otherChange.length || 0))
        };
      }
    }

    return change;
  }

  /**
   * Apply a change to the document
   */
  private applyChange(document: StrategyDocument, change: DocumentChange): void {
    switch (change.operation) {
      case 'insert':
        if (change.content) {
          document.content = 
            document.content.slice(0, change.position) + 
            change.content + 
            document.content.slice(change.position);
        }
        break;
      
      case 'delete':
        if (change.length) {
          document.content = 
            document.content.slice(0, change.position) + 
            document.content.slice(change.position + change.length);
        }
        break;
      
      case 'replace':
        if (change.content && change.length) {
          document.content = 
            document.content.slice(0, change.position) + 
            change.content + 
            document.content.slice(change.position + change.length);
        }
        break;
    }
  }

  /**
   * Get user color for cursor display
   */
  private getUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];
    
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  }

  /**
   * Get user name from session
   */
  private getUserName(userId: string): string {
    // In a real implementation, this would come from a user service
    return `User_${userId.slice(-4)}`;
  }

  /**
   * Clean up inactive sessions
   */
  private cleanupInactiveSessions(): void {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    this.userSessions.forEach((session, userId) => {
      if (now.getTime() - session.lastActivity.getTime() > inactiveThreshold) {
        this.leaveDocument(session.documentId, userId);
      }
    });
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60000); // Run every minute
  }
}
