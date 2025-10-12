import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChefHat, ShoppingCart, Play, Pause, RotateCcw, Plus, Minus, Calendar, BarChart3 } from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  prepTime: number;
  category: string;
}

interface Order {
  id: number;
  customerName: string;
  items: MenuItem[];
  arrivalTime: number;
  estimatedTime: number;
  status: 'waiting' | 'processing' | 'completed';
}

interface SchedulingResult {
  order: Order;
  arrivalTime: number;
  startTime: number;
  completionTime: number;
  waitTime: number;
  turnaroundTime: number;
  responseTime: number;
}

interface SimulationStep {
  time: number;
  event: 'arrival' | 'start' | 'complete';
  order: Order;
  description: string;
}

const menuItems: MenuItem[] = [
  { id: 1, name: 'Caesar Salad', price: 8.99, prepTime: 5, category: 'Appetizers' },
  { id: 2, name: 'Garlic Bread', price: 6.99, prepTime: 3, category: 'Appetizers' },
  { id: 3, name: 'Buffalo Wings', price: 12.99, prepTime: 8, category: 'Appetizers' },
  { id: 4, name: 'Grilled Chicken', price: 18.99, prepTime: 15, category: 'Main Courses' },
  { id: 5, name: 'Beef Steak', price: 24.99, prepTime: 20, category: 'Main Courses' },
  { id: 6, name: 'Salmon Fillet', price: 22.99, prepTime: 12, category: 'Main Courses' },
  { id: 7, name: 'Pasta Carbonara', price: 16.99, prepTime: 10, category: 'Main Courses' },
  { id: 8, name: 'Vegetable Stir Fry', price: 14.99, prepTime: 8, category: 'Main Courses' },
  { id: 9, name: 'Chocolate Cake', price: 7.99, prepTime: 2, category: 'Desserts' },
  { id: 10, name: 'Ice Cream Sundae', price: 5.99, prepTime: 3, category: 'Desserts' },
  { id: 11, name: 'Coffee', price: 3.99, prepTime: 1, category: 'Beverages' },
  { id: 12, name: 'Fresh Juice', price: 4.99, prepTime: 2, category: 'Beverages' }
];

function App() {
  const [activeTab, setActiveTab] = useState<'menu' | 'simulation'>('menu');
  const [cartItems, setCartItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [nextOrderId, setNextOrderId] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [results, setResults] = useState<SchedulingResult[]>([]);
  const [simulation, setSimulation] = useState<SimulationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1000);
  const intervalRef = useRef<NodeJS.Timeout>();

  // FCFS Scheduling Algorithm with corrected calculations
  const calculateFCFS = (orderList: Order[]): { results: SchedulingResult[], simulation: SimulationStep[] } => {
    if (orderList.length === 0) return { results: [], simulation: [] };

    const sortedOrders = [...orderList].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const results: SchedulingResult[] = [];
    const simulationSteps: SimulationStep[] = [];
    let currentProcessingTime = 0;

    // Start from the first arrival time
    const firstArrivalTime = sortedOrders[0].arrivalTime;
    currentProcessingTime = firstArrivalTime;

    sortedOrders.forEach((order) => {
      // Arrival event
      simulationSteps.push({
        time: order.arrivalTime,
        event: 'arrival',
        order,
        description: `Order #${order.id} from ${order.customerName} arrives (${order.items.length} items, ${order.estimatedTime} min prep time)`
      });

      // Calculate start time (max of current processing time and arrival time)
      const startTime = Math.max(currentProcessingTime, order.arrivalTime);
      const completionTime = startTime + order.estimatedTime;
      const waitTime = startTime - order.arrivalTime;
      const turnaroundTime = completionTime - order.arrivalTime;
      const responseTime = waitTime; // In FCFS, response time equals wait time

      // Start processing event
      if (startTime > order.arrivalTime) {
        simulationSteps.push({
          time: startTime,
          event: 'start',
          order,
          description: `Order #${order.id} starts processing after waiting ${waitTime} minutes`
        });
      } else {
        simulationSteps.push({
          time: startTime,
          event: 'start',
          order,
          description: `Order #${order.id} starts processing immediately (no wait time)`
        });
      }

      // Completion event
      simulationSteps.push({
        time: completionTime,
        event: 'complete',
        order,
        description: `Order #${order.id} completed (turnaround time: ${turnaroundTime} minutes)`
      });

      results.push({
        order,
        arrivalTime: order.arrivalTime,
        startTime,
        completionTime,
        waitTime,
        turnaroundTime,
        responseTime
      });

      currentProcessingTime = completionTime;
    });

    // Sort simulation steps by time
    simulationSteps.sort((a, b) => a.time - b.time);

    return { results, simulation: simulationSteps };
  };

  const addToCart = (itemId: number) => {
    const item = menuItems.find(i => i.id === itemId);
    if (item) {
      setCartItems([...cartItems, item]);
    }
  };

  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const submitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerName && cartItems.length > 0) {
      const newOrder: Order = {
        id: nextOrderId,
        customerName,
        items: [...cartItems],
        arrivalTime: currentTime,
        estimatedTime: cartItems.reduce((sum, item) => sum + item.prepTime, 0),
        status: 'waiting'
      };

      setOrders([...orders, newOrder]);
      setCartItems([]);
      setCustomerName('');
      setNextOrderId(nextOrderId + 1);
      setCurrentTime(currentTime + Math.floor(Math.random() * 3) + 1); // Random arrival gap 1-3 minutes
    }
  };

  // Update simulation when orders change
  useEffect(() => {
    const { results: newResults, simulation: newSimulation } = calculateFCFS(orders);
    setResults(newResults);
    setSimulation(newSimulation);
    setCurrentStep(0);
    setIsPlaying(false);
  }, [orders]);

  // Animation loop
  useEffect(() => {
    if (isPlaying && currentStep < simulation.length - 1) {
      intervalRef.current = setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, simulationSpeed);
    } else if (currentStep >= simulation.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentStep, simulation.length, simulationSpeed]);

  const toggleSimulation = () => {
    if (simulation.length === 0) return;
    setIsPlaying(!isPlaying);
  };

  const resetSimulation = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  // Calculate statistics
  const calculateStatistics = () => {
    if (results.length === 0) return null;

    const waitTimes = results.map(r => r.waitTime);
    const turnaroundTimes = results.map(r => r.turnaroundTime);

    return {
      avgWaitTime: Number((waitTimes.reduce((sum, time) => sum + time, 0) / results.length).toFixed(2)),
      avgTurnaroundTime: Number((turnaroundTimes.reduce((sum, time) => sum + time, 0) / results.length).toFixed(2)),
      maxWaitTime: Math.max(...waitTimes),
      minWaitTime: Math.min(...waitTimes),
      maxTurnaroundTime: Math.max(...turnaroundTimes),
      minTurnaroundTime: Math.min(...turnaroundTimes),
      totalOrders: results.length,
      totalTime: results.length > 0 ? Math.max(...results.map(r => r.completionTime)) : 0
    };
  };

  const stats = calculateStatistics();

  // Get orders by status for animation sections
  const getOrdersByStatus = () => {
    const currentSimTime = simulation[currentStep]?.time || 0;
    const waiting: Order[] = [];
    const processing: Order[] = [];
    const completed: Order[] = [];

    orders.forEach(order => {
      const result = results.find(r => r.order.id === order.id);
      if (result) {
        if (currentSimTime < result.startTime) {
          waiting.push(order);
        } else if (currentSimTime >= result.startTime && currentSimTime < result.completionTime) {
          processing.push(order);
        } else if (currentSimTime >= result.completionTime) {
          completed.push(order);
        }
      }
    });

    return { waiting, processing, completed };
  };

  const { waiting, processing, completed } = getOrdersByStatus();

  // Group menu items by category
  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  const cartTime = cartItems.reduce((sum, item) => sum + item.prepTime, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-orange-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <ChefHat className="h-10 w-10 text-orange-500" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">RestaurantOS</h1>
                <p className="text-sm text-gray-600">FCFS Scheduling System</p>
              </div>
            </div>
            
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'menu' 
                    ? 'bg-orange-500 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋 Menu & Orders
              </button>
              <button
                onClick={() => setActiveTab('simulation')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'simulation' 
                    ? 'bg-orange-500 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                 📊 FCFS Simulation
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'menu' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Menu Section */}
            <div className="lg:col-span-2">
              <div className="mb-8">
                <h2 className="text-4xl font-bold text-gray-800 mb-2">Our Menu</h2>
                <p className="text-gray-600">Select items to create an order and demonstrate FCFS scheduling</p>
              </div>

              {Object.entries(groupedMenuItems).map(([category, items]) => (
                <div key={category} className="mb-8">
                  <h3 className="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-orange-200">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map(item => (
                      <div key={item.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200">
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-lg font-semibold text-gray-800">{item.name}</h4>
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-lg text-xs font-medium">
                              {category}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-xl font-bold text-green-600">${item.price.toFixed(2)}</span>
                            <span className="text-blue-600 font-medium flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {item.prepTime}m
                            </span>
                          </div>
                          <button
                            onClick={() => addToCart(item.id)}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add to Order</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
                <div className="flex items-center space-x-3 mb-6">
                  <ShoppingCart className="h-6 w-6 text-orange-500" />
                  <h3 className="text-xl font-semibold text-gray-800">Order Cart</h3>
                </div>

                <div className="max-h-60 overflow-y-auto mb-4">
                  {cartItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Your cart is empty</p>
                  ) : (
                    cartItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-2">
                        <div>
                          <h4 className="font-medium text-gray-800">{item.name}</h4>
                          <p className="text-sm text-gray-600">${item.price.toFixed(2)} • {item.prepTime}m</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {cartItems.length > 0 && (
                  <>
                    <div className="border-t pt-4 mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Total:</span>
                        <span className="font-bold text-green-600">${cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Est. Time:</span>
                        <span className="font-bold text-blue-600">{cartTime} min</span>
                      </div>
                    </div>

                    <form onSubmit={submitOrder} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Customer Name
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Enter customer name"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                      >
                        Place Order (Arrives at {currentTime}m)
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Control Panel */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">FCFS Simulation Dashboard</h2>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Speed:</label>
                    <select
                      value={simulationSpeed}
                      onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded"
                    >
                      <option value={2000}>0.5x</option>
                      <option value={1000}>1x</option>
                      <option value={500}>2x</option>
                      <option value={250}>4x</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={toggleSimulation}
                    disabled={simulation.length === 0}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                  
                  <button
                    onClick={resetSimulation}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Simulation Progress:</span>
                  <span>Step {currentStep + 1} of {simulation.length} | Time: {simulation[currentStep]?.time || 0} minutes</span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${simulation.length > 0 ? ((currentStep + 1) / simulation.length) * 100 : 0}%` }}
                  ></div>
                </div>
                
                {/* Current Event Display */}
                {simulation[currentStep] && (
                  <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <p className="font-medium text-blue-800">
                      Current Event: {simulation[currentStep].description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Average Wait Time (AWT)</h3>
                  <p className="text-2xl font-bold text-blue-600 mb-1">{stats.avgWaitTime}m</p>
                  <p className="text-xs text-gray-500">Range: {stats.minWaitTime}m - {stats.maxWaitTime}m</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Average Turnaround Time (ATT)</h3>
                  <p className="text-2xl font-bold text-green-600 mb-1">{stats.avgTurnaroundTime}m</p>
                  <p className="text-xs text-gray-500">Range: {stats.minTurnaroundTime}m - {stats.maxTurnaroundTime}m</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Total Orders</h3>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalOrders}</p>
                  <p className="text-xs text-gray-500">In simulation</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Total Time</h3>
                  <p className="text-2xl font-bold text-orange-600">{stats.totalTime}m</p>
                  <p className="text-xs text-gray-500">Simulation duration</p>
                </div>
              </div>
            )}

            {/* Gantt Chart */}
            {results.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Gantt Chart - FCFS Order Processing Timeline
                </h3>
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Time scale */}
                    <div className="flex border-b border-gray-200 pb-2 mb-4">
                      <div className="w-40 text-sm font-medium text-gray-600">Time Scale (minutes):</div>
                      <div className="flex-1 flex relative">
                        {Array.from({ length: Math.max(...results.map(r => r.completionTime)) + 1 }, (_, i) => (
                          <div key={i} className="flex-1 text-xs text-center text-gray-500 border-l border-gray-200 min-w-[30px]">
                            {i}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gantt bars */}
                    {results.map((result) => {
                      const maxTime = Math.max(...results.map(r => r.completionTime));
                      const arrivalOffset = (result.arrivalTime / maxTime) * 100;
                      const waitWidth = (result.waitTime / maxTime) * 100;
                      const execWidth = (result.order.estimatedTime / maxTime) * 100;
                      const startOffset = (result.startTime / maxTime) * 100;

                      return (
                        <div key={result.order.id} className="flex items-center mb-4">
                          <div className="w-40 text-sm font-medium text-gray-700">
                            <div>Order #{result.order.id}</div>
                            <div className="text-xs text-gray-500">{result.order.customerName}</div>
                          </div>
                          <div className="flex-1 relative h-10 bg-gray-100 rounded border">
                            {/* Arrival marker */}
                            <div
                              className="absolute top-0 w-1 h-full bg-blue-500 z-10"
                              style={{ left: `${arrivalOffset}%` }}
                              title={`Arrival: ${result.arrivalTime}m`}
                            />
                            
                            {/* Wait time (red bar) */}
                            {result.waitTime > 0 && (
                              <div
                                className="absolute h-full bg-red-300 border-2 border-red-500 rounded-l flex items-center justify-center"
                                style={{
                                  left: `${arrivalOffset}%`,
                                  width: `${waitWidth}%`
                                }}
                                title={`Wait Time: ${result.waitTime}m`}
                              >
                                {result.waitTime > 0 && waitWidth > 8 && (
                                  <span className="text-xs font-medium text-red-800">
                                    Wait: {result.waitTime}m
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Processing time (green bar) */}
                            <div
                              className="absolute h-full bg-green-300 border-2 border-green-500 rounded-r flex items-center justify-center"
                              style={{
                                left: `${startOffset}%`,
                                width: `${execWidth}%`
                              }}
                              title={`Processing: ${result.order.estimatedTime}m`}
                            >
                              {execWidth > 10 && (
                                <span className="text-xs font-medium text-green-800">
                                  Process: {result.order.estimatedTime}m
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-24 text-xs text-gray-600 ml-2 text-center">
                            <div>Start: {result.startTime}m</div>
                            <div>End: {result.completionTime}m</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Legend */}
                <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Arrival Time</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-300 border border-red-500 rounded"></div>
                    <span>Wait Time</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-300 border border-green-500 rounded"></div>
                    <span>Processing Time</span>
                  </div>
                </div>
              </div>
            )}

            {/* Animated Status Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Waiting Orders */}
              <div className="bg-yellow-50 rounded-xl shadow-lg p-6 border-2 border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                  ⏳ Waiting Queue ({waiting.length})
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {waiting.map(order => (
                    <div
                      key={order.id}
                      className="bg-white p-4 rounded-lg shadow border-2 border-yellow-300 animate-bounce"
                      style={{
                        animationDuration: '2s',
                        animationIterationCount: 'infinite'
                      }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">Order #{order.id}</span>
                        <span className="text-sm text-gray-600">{order.estimatedTime}m prep</span>
                      </div>
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.items.length} items • Arrived at {order.arrivalTime}m</p>
                      <div className="mt-2 text-xs text-yellow-700 font-medium">
                        🕐 Waiting in queue...
                      </div>
                    </div>
                  ))}
                  {waiting.length === 0 && (
                    <p className="text-yellow-600 text-center py-8">No orders waiting</p>
                  )}
                </div>
              </div>

              {/* Processing Orders */}
              <div className="bg-blue-50 rounded-xl shadow-lg p-6 border-2 border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                  🔄 Currently Processing ({processing.length})
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {processing.map(order => {
                    const result = results.find(r => r.order.id === order.id);
                    const currentSimTime = simulation[currentStep]?.time || 0;
                    const progress = result ? ((currentSimTime - result.startTime) / order.estimatedTime) * 100 : 0;
                    
                    return (
                      <div
                        key={order.id}
                        className="bg-white p-4 rounded-lg shadow border-2 border-blue-300 animate-pulse"
                        style={{
                          animationDuration: '1.5s',
                          animationIterationCount: 'infinite'
                        }}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-800">Order #{order.id}</span>
                          <span className="text-sm text-gray-600">{order.estimatedTime}m total</span>
                        </div>
                        <p className="text-sm text-gray-600">{order.customerName}</p>
                        <p className="text-xs text-gray-500">{order.items.length} items</p>
                        {result && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-blue-700 mb-1">
                              <span>Processing...</span>
                              <span>{Math.min(100, Math.max(0, progress)).toFixed(0)}%</span>
                            </div>
                            <div className="bg-blue-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {processing.length === 0 && (
                    <p className="text-blue-600 text-center py-8">No orders being processed</p>
                  )}
                </div>
              </div>

              {/* Completed Orders */}
              <div className="bg-green-50 rounded-xl shadow-lg p-6 border-2 border-green-200">
                <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                  ✅ Completed ({completed.length})
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {completed.map(order => {
                    const result = results.find(r => r.order.id === order.id);
                    return (
                      <div
                        key={order.id}
                        className="bg-white p-4 rounded-lg shadow border-2 border-green-300 animate-fade-in opacity-100"
                        style={{
                          animation: 'fadeIn 0.5s ease-in'
                        }}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-800">Order #{order.id}</span>
                          <span className="text-sm text-green-600 font-medium">✓ Done</span>
                        </div>
                        <p className="text-sm text-gray-600">{order.customerName}</p>
                        <p className="text-xs text-gray-500">{order.items.length} items</p>
                        {result && (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-yellow-100 p-1 rounded text-center">
                              <div className="font-medium text-yellow-800">Wait</div>
                              <div className="text-yellow-600">{result.waitTime}m</div>
                            </div>
                            <div className="bg-green-100 p-1 rounded text-center">
                              <div className="font-medium text-green-800">Total</div>
                              <div className="text-green-600">{result.turnaroundTime}m</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {completed.length === 0 && (
                    <p className="text-green-600 text-center py-8">No orders completed yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Order Analysis */}
            {results.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Detailed Order Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map(result => (
                    <div key={result.order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium text-gray-800">Order #{result.order.id}</span>
                        <span className="text-sm text-gray-600">{result.order.customerName}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-100 p-2 rounded text-center">
                          <div className="text-xs font-medium text-blue-800">Arrival</div>
                          <div className="text-sm font-bold text-blue-600">{result.arrivalTime}m</div>
                        </div>
                        <div className="bg-yellow-100 p-2 rounded text-center">
                          <div className="text-xs font-medium text-yellow-800">Wait Time</div>
                          <div className="text-sm font-bold text-yellow-600">{result.waitTime}m</div>
                        </div>
                        <div className="bg-green-100 p-2 rounded text-center">
                          <div className="text-xs font-medium text-green-800">Process Time</div>
                          <div className="text-sm font-bold text-green-600">{result.order.estimatedTime}m</div>
                        </div>
                        <div className="bg-purple-100 p-2 rounded text-center">
                          <div className="text-xs font-medium text-purple-800">Turnaround</div>
                          <div className="text-sm font-bold text-purple-600">{result.turnaroundTime}m</div>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        Start: {result.startTime}m → End: {result.completionTime}m
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Algorithm Explanation */}
            <div className="bg-blue-50 rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <h3 className="text-xl font-semibold text-blue-800 mb-4">🎓 FCFS Algorithm Explanation</h3>
              <div className="space-y-3 text-blue-700">
                <p><strong>How it works:</strong> Orders are processed in the exact order they arrive - first come, first served.</p>
                <p><strong>Key Calculations:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Wait Time:</strong> Start Time - Arrival Time</li>
                  <li><strong>Turnaround Time:</strong> Completion Time - Arrival Time</li>
                  <li><strong>Response Time:</strong> Same as Wait Time in FCFS</li>
                  <li><strong>Average Wait Time (AWT):</strong> Sum of all wait times ÷ Number of orders</li>
                  <li><strong>Average Turnaround Time (ATT):</strong> Sum of all turnaround times ÷ Number of orders</li>
                </ul>
                <p><strong>Advantages:</strong> Simple, fair, no starvation, easy to implement</p>
                <p><strong>Disadvantages:</strong> Can lead to convoy effect where short orders wait behind long ones</p>
                <p><strong>Real-world Application:</strong> Perfect for restaurant queues where fairness is prioritized over efficiency</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in;
        }
      `}</style>
    </div>
  );
}

export default App;
