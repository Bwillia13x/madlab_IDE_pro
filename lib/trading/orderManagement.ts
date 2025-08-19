import { EventEmitter } from 'events';

export interface Order {
  id: string;
  clientOrderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop' | 'iceberg' | 'twap' | 'vwap';
  quantity: number;
  price?: number;
  stopPrice?: number;
  trailingAmount?: number;
  trailingPercent?: number;
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok' | 'gtd';
  goodTillDate?: Date;
  status: 'pending' | 'new' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired';
  executedQuantity: number;
  remainingQuantity: number;
  averageExecutionPrice: number;
  commissions: number;
  fees: number;
  slippage: number;
  parentOrderId?: string;
  childOrderIds: string[];
  legs?: OrderLeg[]; // For complex orders
  routing: OrderRouting;
  execution: OrderExecution;
  created: Date;
  lastUpdated: Date;
}

export interface OrderLeg {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  ratio: number;
  price?: number;
  orderType: Order['orderType'];
}

export interface OrderRouting {
  venue: string;
  preferredVenues: string[];
  routingStrategy: 'smart' | 'direct' | 'dark_pool' | 'fragmented' | 'price_improvement';
  allowDarkPools: boolean;
  minimumFillSize: number;
  maxParticipationRate: number;
  priceImprovement: boolean;
  hiddenQuantity: number;
}

export interface OrderExecution {
  executions: Execution[];
  totalExecuted: number;
  averagePrice: number;
  totalCommissions: number;
  totalFees: number;
  estimatedSlippage: number;
  actualSlippage: number;
  marketImpact: number;
  implementationShortfall: number;
}

export interface Execution {
  id: string;
  orderId: string;
  venue: string;
  timestamp: Date;
  price: number;
  quantity: number;
  commission: number;
  fees: number;
  liquidityFlag: 'maker' | 'taker' | 'unknown';
  contraparty?: string;
  tradeId: string;
}

export interface SmartOrderRouting {
  algorithm: 'vwap' | 'twap' | 'implementation_shortfall' | 'arrival_price' | 'pov' | 'iceberg';
  parameters: Record<string, any>;
  venues: VenueInfo[];
  routing_logic: RoutingRule[];
}

export interface VenueInfo {
  id: string;
  name: string;
  type: 'exchange' | 'dark_pool' | 'ecn' | 'crossing_network';
  latency: number;
  fees: VenueFees;
  liquidity: LiquidityInfo;
  isActive: boolean;
  priority: number;
}

export interface VenueFees {
  makerFee: number;
  takerFee: number;
  minimumFee: number;
  maximumFee: number;
  feeStructure: 'per_share' | 'percentage' | 'tiered';
}

export interface LiquidityInfo {
  averageSpread: number;
  averageDepth: number;
  marketShare: number;
  fillRate: number;
  averageFillSize: number;
  priceImprovement: number;
}

export interface RoutingRule {
  condition: string;
  action: string;
  priority: number;
  parameters: Record<string, any>;
}

export interface OrderPerformanceMetrics {
  orderId: string;
  symbol: string;
  executionQuality: number;
  slippageBps: number;
  marketImpactBps: number;
  fillRate: number;
  speedToMarket: number;
  priceImprovement: number;
  implementationShortfall: number;
  participationRate: number;
  venueBreakdown: VenuePerformance[];
}

export interface VenuePerformance {
  venue: string;
  quantity: number;
  percentage: number;
  averagePrice: number;
  priceImprovement: number;
  fillRate: number;
  latency: number;
}

export class OrderManagementSystem extends EventEmitter {
  private orders: Map<string, Order> = new Map();
  private executions: Map<string, Execution> = new Map();
  private venues: Map<string, VenueInfo> = new Map();
  private routingEngine: SmartOrderRouter = new SmartOrderRouter();
  private performanceTracker: PerformanceTracker = new PerformanceTracker();

  constructor() {
    super();
    this.initializeVenues();
  }

  private initializeVenues(): void {
    const defaultVenues: VenueInfo[] = [
      {
        id: 'nasdaq',
        name: 'NASDAQ',
        type: 'exchange',
        latency: 0.5,
        fees: { makerFee: -0.0025, takerFee: 0.0030, minimumFee: 0, maximumFee: 1000, feeStructure: 'per_share' },
        liquidity: { averageSpread: 0.01, averageDepth: 1000000, marketShare: 0.25, fillRate: 0.98, averageFillSize: 500, priceImprovement: 0.0002 },
        isActive: true,
        priority: 1
      },
      {
        id: 'nyse',
        name: 'NYSE',
        type: 'exchange',
        latency: 0.6,
        fees: { makerFee: -0.0020, takerFee: 0.0030, minimumFee: 0, maximumFee: 1000, feeStructure: 'per_share' },
        liquidity: { averageSpread: 0.01, averageDepth: 800000, marketShare: 0.20, fillRate: 0.97, averageFillSize: 450, priceImprovement: 0.0001 },
        isActive: true,
        priority: 2
      },
      {
        id: 'dark_pool_1',
        name: 'Dark Pool Alpha',
        type: 'dark_pool',
        latency: 1.2,
        fees: { makerFee: 0, takerFee: 0.0020, minimumFee: 0, maximumFee: 500, feeStructure: 'per_share' },
        liquidity: { averageSpread: 0, averageDepth: 500000, marketShare: 0.15, fillRate: 0.85, averageFillSize: 300, priceImprovement: 0.0005 },
        isActive: true,
        priority: 3
      }
    ];

    defaultVenues.forEach(venue => this.venues.set(venue.id, venue));
  }

  async submitOrder(orderParams: Omit<Order, 'id' | 'status' | 'executedQuantity' | 'remainingQuantity' | 'averageExecutionPrice' | 'commissions' | 'fees' | 'slippage' | 'childOrderIds' | 'execution' | 'created' | 'lastUpdated'>): Promise<Order> {
    const order: Order = {
      ...orderParams,
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      executedQuantity: 0,
      remainingQuantity: orderParams.quantity,
      averageExecutionPrice: 0,
      commissions: 0,
      fees: 0,
      slippage: 0,
      childOrderIds: [],
      execution: {
        executions: [],
        totalExecuted: 0,
        averagePrice: 0,
        totalCommissions: 0,
        totalFees: 0,
        estimatedSlippage: 0,
        actualSlippage: 0,
        marketImpact: 0,
        implementationShortfall: 0
      },
      created: new Date(),
      lastUpdated: new Date()
    };

    this.orders.set(order.id, order);
    this.emit('orderSubmitted', order);

    // Start order routing process
    await this.routeOrder(order);

    return order;
  }

  private async routeOrder(order: Order): Promise<void> {
    this.emit('orderRouting', order);
    
    const routing = await this.routingEngine.routeOrder(order, Array.from(this.venues.values()));
    
    // Update order status
    order.status = 'new';
    order.lastUpdated = new Date();
    this.emit('orderRouted', { order, routing });

    // Execute the order based on routing decisions
    await this.executeOrder(order, routing);
  }

  private async executeOrder(order: Order, routing: RoutingDecision[]): Promise<void> {
    for (const route of routing) {
      if (order.remainingQuantity <= 0) break;

      const venue = this.venues.get(route.venueId);
      if (!venue || !venue.isActive) continue;

      const execution = await this.simulateExecution(order, venue, route.quantity);
      
      if (execution) {
        this.executions.set(execution.id, execution);
        order.execution.executions.push(execution);
        
        // Update order state
        order.executedQuantity += execution.quantity;
        order.remainingQuantity -= execution.quantity;
        order.commissions += execution.commission;
        order.fees += execution.fees;
        
        // Update average execution price
        const totalExecutedValue = order.execution.totalExecuted * order.averageExecutionPrice + 
                                 execution.quantity * execution.price;
        order.execution.totalExecuted += execution.quantity;
        order.averageExecutionPrice = totalExecutedValue / order.execution.totalExecuted;
        
        order.lastUpdated = new Date();
        
        // Update order status
        if (order.remainingQuantity === 0) {
          order.status = 'filled';
        } else if (order.executedQuantity > 0) {
          order.status = 'partially_filled';
        }

        this.emit('orderExecuted', { order, execution });
        
        // Calculate performance metrics
        await this.performanceTracker.updateMetrics(order, execution);
      }
    }

    // Final order processing
    await this.finalizeOrder(order);
  }

  private async simulateExecution(order: Order, venue: VenueInfo, quantity: number): Promise<Execution | null> {
    // Simulate market conditions and execution
    const fillProbability = venue.liquidity.fillRate;
    
    if (Math.random() > fillProbability) {
      return null; // Order not filled at this venue
    }

    const basePrice = order.price || 100; // Assume $100 base price for simulation
    const spread = venue.liquidity.averageSpread;
    const marketImpact = this.calculateMarketImpact(quantity, venue.liquidity.averageDepth);
    
    let executionPrice = basePrice;
    
    // Adjust price based on order type and market conditions
    if (order.side === 'buy') {
      executionPrice += spread / 2 + marketImpact;
    } else {
      executionPrice -= spread / 2 + marketImpact;
    }

    // Add price improvement for dark pools
    if (venue.type === 'dark_pool') {
      const improvement = venue.liquidity.priceImprovement;
      executionPrice += order.side === 'buy' ? -improvement : improvement;
    }

    const execution: Execution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: order.id,
      venue: venue.id,
      timestamp: new Date(),
      price: executionPrice,
      quantity,
      commission: this.calculateCommission(quantity, executionPrice, venue.fees),
      fees: this.calculateFees(quantity, executionPrice, venue.fees),
      liquidityFlag: Math.random() > 0.6 ? 'maker' : 'taker',
      tradeId: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    return execution;
  }

  private calculateMarketImpact(quantity: number, depth: number): number {
    // Simple market impact model: impact increases with square root of quantity
    const participationRate = quantity / depth;
    return Math.sqrt(participationRate) * 0.01; // Base impact of 1 cent per sqrt(participation)
  }

  private calculateCommission(quantity: number, price: number, fees: VenueFees): number {
    switch (fees.feeStructure) {
      case 'per_share':
        return Math.max(fees.minimumFee, Math.min(quantity * Math.abs(fees.takerFee), fees.maximumFee));
      case 'percentage':
        return (quantity * price) * Math.abs(fees.takerFee);
      default:
        return quantity * 0.005; // Default 0.5 cents per share
    }
  }

  private calculateFees(quantity: number, price: number, fees: VenueFees): number {
    // Additional regulatory and clearing fees
    return (quantity * price) * 0.0001; // 1 basis point in fees
  }

  private async finalizeOrder(order: Order): Promise<void> {
    // Calculate final metrics
    order.execution.totalCommissions = order.commissions;
    order.execution.totalFees = order.fees;
    
    // Calculate slippage
    if (order.price && order.execution.totalExecuted > 0) {
      order.slippage = Math.abs(order.averageExecutionPrice - order.price);
      order.execution.actualSlippage = order.slippage;
    }

    // Calculate implementation shortfall
    const benchmarkPrice = order.price || order.averageExecutionPrice;
    const executionCost = Math.abs(order.averageExecutionPrice - benchmarkPrice) * order.execution.totalExecuted;
    const opportunityCost = 0; // Would calculate based on price movement during execution
    order.execution.implementationShortfall = (executionCost + opportunityCost + order.commissions + order.fees) / (benchmarkPrice * order.quantity);

    this.emit('orderFinalized', order);
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    if (['filled', 'canceled', 'rejected'].includes(order.status)) {
      return false;
    }

    order.status = 'canceled';
    order.lastUpdated = new Date();
    
    this.emit('orderCanceled', order);
    return true;
  }

  async modifyOrder(orderId: string, modifications: Partial<Pick<Order, 'quantity' | 'price' | 'stopPrice'>>): Promise<Order | null> {
    const order = this.orders.get(orderId);
    if (!order || ['filled', 'canceled', 'rejected'].includes(order.status)) {
      return null;
    }

    // Apply modifications
    if (modifications.quantity !== undefined) {
      order.quantity = modifications.quantity;
      order.remainingQuantity = order.quantity - order.executedQuantity;
    }
    if (modifications.price !== undefined) {
      order.price = modifications.price;
    }
    if (modifications.stopPrice !== undefined) {
      order.stopPrice = modifications.stopPrice;
    }

    order.lastUpdated = new Date();
    this.emit('orderModified', order);
    
    return order;
  }

  getOrder(orderId: string): Order | null {
    return this.orders.get(orderId) || null;
  }

  getOrdersBySymbol(symbol: string): Order[] {
    return Array.from(this.orders.values()).filter(order => order.symbol === symbol);
  }

  getOrdersByStatus(status: Order['status']): Order[] {
    return Array.from(this.orders.values()).filter(order => order.status === status);
  }

  getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  async getOrderPerformance(orderId: string): Promise<OrderPerformanceMetrics | null> {
    return this.performanceTracker.getOrderMetrics(orderId);
  }

  async getVenuePerformance(): Promise<Map<string, VenuePerformance[]>> {
    return this.performanceTracker.getVenuePerformance();
  }

  addVenue(venue: VenueInfo): void {
    this.venues.set(venue.id, venue);
    this.emit('venueAdded', venue);
  }

  updateVenue(venueId: string, updates: Partial<VenueInfo>): boolean {
    const venue = this.venues.get(venueId);
    if (!venue) return false;

    Object.assign(venue, updates);
    this.emit('venueUpdated', venue);
    return true;
  }

  removeVenue(venueId: string): boolean {
    const deleted = this.venues.delete(venueId);
    if (deleted) {
      this.emit('venueRemoved', venueId);
    }
    return deleted;
  }
}

class SmartOrderRouter {
  async routeOrder(order: Order, venues: VenueInfo[]): Promise<RoutingDecision[]> {
    const activeVenues = venues.filter(v => v.isActive);
    const routing: RoutingDecision[] = [];
    
    switch (order.routing.routingStrategy) {
      case 'smart':
        return this.smartRouting(order, activeVenues);
      case 'direct':
        return this.directRouting(order, activeVenues);
      case 'dark_pool':
        return this.darkPoolRouting(order, activeVenues);
      case 'fragmented':
        return this.fragmentedRouting(order, activeVenues);
      case 'price_improvement':
        return this.priceImprovementRouting(order, activeVenues);
      default:
        return this.smartRouting(order, activeVenues);
    }
  }

  private smartRouting(order: Order, venues: VenueInfo[]): RoutingDecision[] {
    // Sort venues by composite score (liquidity, fees, fill rate)
    const scoredVenues = venues.map(venue => ({
      venue,
      score: this.calculateVenueScore(venue, order)
    })).sort((a, b) => b.score - a.score);

    const routing: RoutingDecision[] = [];
    let remainingQuantity = order.quantity;

    for (const { venue } of scoredVenues) {
      if (remainingQuantity <= 0) break;

      const maxQuantity = Math.min(
        remainingQuantity,
        venue.liquidity.averageFillSize * 2,
        order.routing.minimumFillSize || remainingQuantity
      );

      if (maxQuantity > 0) {
        routing.push({
          venueId: venue.id,
          quantity: maxQuantity,
          priority: venue.priority,
          estimatedFillTime: venue.latency,
          estimatedFees: this.estimateFees(maxQuantity, order.price || 100, venue.fees)
        });

        remainingQuantity -= maxQuantity;
      }
    }

    return routing;
  }

  private directRouting(order: Order, venues: VenueInfo[]): RoutingDecision[] {
    const primaryVenue = venues.find(v => v.id === order.routing.preferredVenues[0]) || venues[0];
    
    return [{
      venueId: primaryVenue.id,
      quantity: order.quantity,
      priority: 1,
      estimatedFillTime: primaryVenue.latency,
      estimatedFees: this.estimateFees(order.quantity, order.price || 100, primaryVenue.fees)
    }];
  }

  private darkPoolRouting(order: Order, venues: VenueInfo[]): RoutingDecision[] {
    const darkPools = venues.filter(v => v.type === 'dark_pool');
    return this.smartRouting(order, darkPools);
  }

  private fragmentedRouting(order: Order, venues: VenueInfo[]): RoutingDecision[] {
    const routing: RoutingDecision[] = [];
    const chunkSize = Math.max(1, Math.floor(order.quantity / venues.length));
    let remainingQuantity = order.quantity;

    for (const venue of venues) {
      if (remainingQuantity <= 0) break;

      const quantity = Math.min(chunkSize, remainingQuantity);
      routing.push({
        venueId: venue.id,
        quantity,
        priority: venue.priority,
        estimatedFillTime: venue.latency,
        estimatedFees: this.estimateFees(quantity, order.price || 100, venue.fees)
      });

      remainingQuantity -= quantity;
    }

    return routing;
  }

  private priceImprovementRouting(order: Order, venues: VenueInfo[]): RoutingDecision[] {
    // Prioritize venues with best price improvement
    const sortedVenues = venues.sort((a, b) => b.liquidity.priceImprovement - a.liquidity.priceImprovement);
    return this.smartRouting(order, sortedVenues);
  }

  private calculateVenueScore(venue: VenueInfo, order: Order): number {
    const liquidityScore = venue.liquidity.fillRate * 0.3;
    const feeScore = (1 - Math.abs(venue.fees.takerFee) / 0.01) * 0.2; // Normalize fees
    const latencyScore = (1 - venue.latency / 10) * 0.2; // Normalize latency
    const improvementScore = venue.liquidity.priceImprovement * 1000 * 0.3; // Price improvement

    return liquidityScore + feeScore + latencyScore + improvementScore;
  }

  private estimateFees(quantity: number, price: number, fees: VenueFees): number {
    switch (fees.feeStructure) {
      case 'per_share':
        return quantity * Math.abs(fees.takerFee);
      case 'percentage':
        return quantity * price * Math.abs(fees.takerFee);
      default:
        return quantity * 0.005;
    }
  }
}

interface RoutingDecision {
  venueId: string;
  quantity: number;
  priority: number;
  estimatedFillTime: number;
  estimatedFees: number;
}

class PerformanceTracker {
  private orderMetrics: Map<string, OrderPerformanceMetrics> = new Map();
  private venuePerformance: Map<string, VenuePerformance[]> = new Map();

  async updateMetrics(order: Order, execution: Execution): Promise<void> {
    let metrics = this.orderMetrics.get(order.id);
    
    if (!metrics) {
      metrics = {
        orderId: order.id,
        symbol: order.symbol,
        executionQuality: 0,
        slippageBps: 0,
        marketImpactBps: 0,
        fillRate: 0,
        speedToMarket: 0,
        priceImprovement: 0,
        implementationShortfall: 0,
        participationRate: 0,
        venueBreakdown: []
      };
    }

    // Update metrics based on execution
    this.calculateExecutionQuality(metrics, order, execution);
    this.updateVenueBreakdown(metrics, execution);
    
    this.orderMetrics.set(order.id, metrics);
  }

  private calculateExecutionQuality(metrics: OrderPerformanceMetrics, order: Order, execution: Execution): void {
    // Execution quality score based on multiple factors
    const priceQuality = order.price ? 1 - Math.abs(execution.price - order.price) / order.price : 1;
    const speedQuality = Math.max(0, 1 - (execution.timestamp.getTime() - order.created.getTime()) / 60000); // Penalty after 1 minute
    const fillQuality = order.execution.totalExecuted / order.quantity;
    
    metrics.executionQuality = (priceQuality * 0.4 + speedQuality * 0.3 + fillQuality * 0.3) * 100;
    metrics.fillRate = fillQuality * 100;
    metrics.speedToMarket = (execution.timestamp.getTime() - order.created.getTime()) / 1000; // seconds
    
    if (order.price) {
      metrics.slippageBps = Math.abs(execution.price - order.price) / order.price * 10000;
    }
  }

  private updateVenueBreakdown(metrics: OrderPerformanceMetrics, execution: Execution): void {
    let venuePerf = metrics.venueBreakdown.find(v => v.venue === execution.venue);
    
    if (!venuePerf) {
      venuePerf = {
        venue: execution.venue,
        quantity: 0,
        percentage: 0,
        averagePrice: 0,
        priceImprovement: 0,
        fillRate: 0,
        latency: 0
      };
      metrics.venueBreakdown.push(venuePerf);
    }

    // Update venue performance
    const totalQuantity = venuePerf.quantity + execution.quantity;
    venuePerf.averagePrice = (venuePerf.averagePrice * venuePerf.quantity + execution.price * execution.quantity) / totalQuantity;
    venuePerf.quantity = totalQuantity;
    
    // Calculate percentage of total order
    const totalOrderQuantity = metrics.venueBreakdown.reduce((sum, v) => sum + v.quantity, 0);
    metrics.venueBreakdown.forEach(v => {
      v.percentage = (v.quantity / totalOrderQuantity) * 100;
    });
  }

  async getOrderMetrics(orderId: string): Promise<OrderPerformanceMetrics | null> {
    return this.orderMetrics.get(orderId) || null;
  }

  async getVenuePerformance(): Promise<Map<string, VenuePerformance[]>> {
    return this.venuePerformance;
  }
}

export const orderManagementSystem = new OrderManagementSystem();