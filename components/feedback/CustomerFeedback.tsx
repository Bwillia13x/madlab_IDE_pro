'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Star, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { analytics } from '@/lib/analytics';

interface FeedbackData {
  userType: 'financial-analyst' | 'quant-developer' | 'portfolio-manager' | 'trader' | 'other';
  currentTools: string[];
  usabilityRating: number;
  featureImportance: Record<string, number>;
  painPoints: string;
  suggestions: string;
  willingToPay: boolean;
  priceRange: string;
  emailForFollowup?: string;
}

const USER_TYPES = [
  { value: 'financial-analyst', label: 'Financial Analyst' },
  { value: 'quant-developer', label: 'Quantitative Developer' },
  { value: 'portfolio-manager', label: 'Portfolio Manager' },
  { value: 'trader', label: 'Trader' },
  { value: 'other', label: 'Other' },
];

const CURRENT_TOOLS = [
  'Bloomberg Terminal',
  'FactSet',
  'Excel/Google Sheets',
  'Python/R',
  'Jupyter Notebooks',
  'TradingView',
  'AlphaSense',
  'Koyfin',
  'Custom Internal Tools',
];

const FEATURES = [
  { key: 'charts', label: 'Interactive Charts & Visualizations' },
  { key: 'dcf', label: 'DCF Modeling & Valuation' },
  { key: 'agent', label: 'AI Agent Integration' },
  { key: 'data', label: 'Real-time Financial Data' },
  { key: 'widgets', label: 'Customizable Widget System' },
  { key: 'export', label: 'Data Export Capabilities' },
  { key: 'collaboration', label: 'Team Collaboration Features' },
  { key: 'api', label: 'API & Developer Tools' },
];

const PRICE_RANGES = [
  'Free (with limitations)',
  '$50-100/month',
  '$100-300/month',
  '$300-1000/month',
  '$1000+/month',
  'Enterprise pricing',
];

export function CustomerFeedback() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedback, setFeedback] = useState<Partial<FeedbackData>>({
    currentTools: [],
    featureImportance: {},
    usabilityRating: 0,
    willingToPay: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToolChange = (tool: string, checked: boolean) => {
    setFeedback(prev => ({
      ...prev,
      currentTools: checked 
        ? [...(prev.currentTools || []), tool]
        : (prev.currentTools || []).filter(t => t !== tool)
    }));
  };

  const handleFeatureRating = (feature: string, rating: number) => {
    setFeedback(prev => ({
      ...prev,
      featureImportance: {
        ...prev.featureImportance,
        [feature]: rating
      }
    }));
  };

  const handleSubmit = async () => {
    if (!feedback.userType || !feedback.painPoints) {
      toast.error('Please fill in required fields (user type and pain points)');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Track feedback submission
      analytics.track('customer_feedback_submitted', {
        userType: feedback.userType,
        usabilityRating: feedback.usabilityRating,
        willingToPay: feedback.willingToPay,
        priceRange: feedback.priceRange,
        toolsUsed: feedback.currentTools?.length || 0,
        featuresRated: Object.keys(feedback.featureImportance || {}).length,
      });

      // In a real app, this would send to your backend
      console.log('Customer Feedback Submitted:', feedback);
      
      // Store locally for development
      const existingFeedback = JSON.parse(
        localStorage.getItem('madlab-customer-feedback') || '[]'
      );
      existingFeedback.push({
        ...feedback,
        timestamp: new Date().toISOString(),
        sessionId: crypto.randomUUID(),
      });
      localStorage.setItem('madlab-customer-feedback', JSON.stringify(existingFeedback));
      
      toast.success('Thank you for your feedback! We\'ll use this to improve MAD LAB.');
      setIsExpanded(false);
      
      // Reset form
      setFeedback({
        currentTools: [],
        featureImportance: {},
        usabilityRating: 0,
        willingToPay: false,
      });
      
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentUsability = feedback.usabilityRating ?? 0;
  const isComplete = Boolean(feedback.userType && feedback.painPoints && currentUsability > 0);

  if (!isExpanded) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4" />
            Help Shape MAD LAB
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3">
            Share your experience and help us build the perfect financial workbench
          </p>
          <Button 
            onClick={() => setIsExpanded(true)}
            size="sm" 
            className="w-full"
            data-testid="feedback-expand"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Give Feedback
            <ChevronUp className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-[80vh] overflow-y-auto z-50 shadow-xl border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Customer Feedback
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            data-testid="feedback-collapse"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Type */}
        <div>
          <Label className="text-sm font-medium">What best describes your role? *</Label>
          <RadioGroup
            value={feedback.userType}
            onValueChange={(value) => setFeedback(prev => ({ ...prev, userType: value as any }))}
            className="mt-2"
          >
            {USER_TYPES.map(type => (
              <div key={type.value} className="flex items-center space-x-2">
                <RadioGroupItem value={type.value} id={type.value} />
                <Label htmlFor={type.value} className="text-sm">{type.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Current Tools */}
        <div>
          <Label className="text-sm font-medium">What tools do you currently use?</Label>
          <div className="mt-2 space-y-2">
            {CURRENT_TOOLS.map(tool => (
              <div key={tool} className="flex items-center space-x-2">
                <Checkbox
                  id={tool}
                  checked={feedback.currentTools?.includes(tool) || false}
                  onCheckedChange={(checked) => handleToolChange(tool, checked as boolean)}
                />
                <Label htmlFor={tool} className="text-sm">{tool}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* Usability Rating */}
        <div>
          <Label className="text-sm font-medium">How would you rate MAD LAB's usability? *</Label>
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(rating => (
              <Button
                key={rating}
                variant={(currentUsability >= rating) ? "default" : "outline"}
                size="sm"
                onClick={() => setFeedback(prev => ({ ...prev, usabilityRating: rating }))}
                className="p-2"
              >
                <Star className="h-4 w-4" />
              </Button>
            ))}
            <span className="text-sm text-muted-foreground ml-2">
              {currentUsability > 0 ? `${currentUsability}/5` : ''}
            </span>
          </div>
        </div>

        {/* Feature Importance */}
        <div>
          <Label className="text-sm font-medium">How important are these features?</Label>
          <div className="mt-2 space-y-2">
            {FEATURES.map(feature => (
              <div key={feature.key} className="flex items-center justify-between">
                <span className="text-sm">{feature.label}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <Button
                      key={rating}
                      variant={
                        (feedback.featureImportance?.[feature.key] || 0) >= rating 
                          ? "default" 
                          : "outline"
                      }
                      size="sm"
                      onClick={() => handleFeatureRating(feature.key, rating)}
                      className="w-6 h-6 p-0 text-xs"
                    >
                      {rating}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pain Points */}
        <div>
          <Label htmlFor="painPoints" className="text-sm font-medium">
            What are your biggest pain points with current tools? *
          </Label>
          <Textarea
            id="painPoints"
            placeholder="Describe challenges you face with existing financial analysis tools..."
            value={feedback.painPoints || ''}
            onChange={(e) => setFeedback(prev => ({ ...prev, painPoints: e.target.value }))}
            className="mt-2"
            rows={3}
          />
        </div>

        {/* Suggestions */}
        <div>
          <Label htmlFor="suggestions" className="text-sm font-medium">
            Suggestions for improvement
          </Label>
          <Textarea
            id="suggestions"
            placeholder="What would make MAD LAB more valuable for your workflow?"
            value={feedback.suggestions || ''}
            onChange={(e) => setFeedback(prev => ({ ...prev, suggestions: e.target.value }))}
            className="mt-2"
            rows={3}
          />
        </div>

        {/* Pricing */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="willingToPay"
              checked={feedback.willingToPay}
              onCheckedChange={(checked) => setFeedback(prev => ({ ...prev, willingToPay: checked as boolean }))}
            />
            <Label htmlFor="willingToPay" className="text-sm font-medium">
              I would consider paying for this tool
            </Label>
          </div>
          
          {feedback.willingToPay && (
            <div className="ml-6">
              <Label className="text-sm">What price range would be reasonable?</Label>
              <RadioGroup
                value={feedback.priceRange}
                onValueChange={(value) => setFeedback(prev => ({ ...prev, priceRange: value }))}
                className="mt-2"
              >
                {PRICE_RANGES.map(range => (
                  <div key={range} className="flex items-center space-x-2">
                    <RadioGroupItem value={range} id={range} />
                    <Label htmlFor={range} className="text-sm">{range}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </div>

        {/* Email for follow-up */}
        <div>
          <Label htmlFor="email" className="text-sm font-medium">
            Email (optional - for follow-up interviews)
          </Label>
          <input
            id="email"
            type="email"
            placeholder="your.email@company.com"
            value={feedback.emailForFollowup || ''}
            onChange={(e) => setFeedback(prev => ({ ...prev, emailForFollowup: e.target.value }))}
            className="mt-2 w-full px-3 py-2 border border-border rounded-md text-sm"
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          className="w-full"
          data-testid="feedback-submit"
        >
          {isSubmitting ? (
            'Submitting...'
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Feedback
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Your feedback helps us build better financial tools
        </p>
      </CardContent>
    </Card>
  );
}