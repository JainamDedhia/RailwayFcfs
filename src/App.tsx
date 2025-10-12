import React, { useState, useEffect, useRef } from 'react';
import { Clock, Train, Ticket, Play, Pause, RotateCcw, Plus, Minus, BarChart3, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Train route interface
interface TrainRoute {
  id: number;
  name: string;
  fare: number;
  travelTime: number;
  category: string;
  trainNumber: string;
}

// Booking interface
interface Booking {
  id: number;
  passengerName: string;
  routes: TrainRoute[];
  arrivalTime: number;
  estimatedTime: number;
  status: 'waiting' | 'processing' | 'completed';
}

// Scheduling result interface
interface SchedulingResult {
  booking: Booking;
  arrivalTime: number;
  startTime: number;
  completionTime: number;
  waitTime: number;
  turnaroundTime: number;
  responseTime: number;
}

// Simulation step interface
interface SimulationStep {
  time: number;
  event: 'arrival' | 'start' | 'complete';
  booking: Booking;
  description: string;
}

// Available train routes with different categories
const trainRoutes: TrainRoute[] = [
  { id: 1, name: 'Mumbai → Pune', fare: 250, travelTime: 3, category: 'Short Distance', trainNumber: 'EXP-101' },
  { id: 2, name: 'Delhi → Agra', fare: 320, travelTime: 4, category: 'Short Distance', trainNumber: 'EXP-102' },
  { id: 3, name: 'Chennai → Bangalore', fare: 450, travelTime: 5, category: 'Short Distance', trainNumber: 'EXP-103' },
  { id: 4, name: 'Mumbai → Delhi', fare: 1200, travelTime: 16, category: 'Long Distance', trainNumber: 'RAJ-201' },
  { id: 5, name: 'Kolkata → Mumbai', fare: 1500, travelTime: 20, category: 'Long Distance', trainNumber: 'DUR-202' },
  { id: 6, name: 'Delhi → Kolkata', fare: 1350, travelTime: 18, category: 'Long Distance', trainNumber: 'RAJ-203' },
  { id: 7, name: 'Bangalore → Hyderabad', fare: 650, travelTime: 8, category: 'Medium Distance', trainNumber: 'SHT-301' },
  { id: 8, name: 'Chennai → Coimbatore', fare: 550, travelTime: 7, category: 'Medium Distance', trainNumber: 'NIL-302' },
  { id: 9, name: 'Pune → Goa', fare: 600, travelTime: 9, category: 'Medium Distance', trainNumber: 'MAN-303' },
  { id: 10, name: 'Jaipur → Udaipur', fare: 500, travelTime: 6, category: 'Medium Distance', trainNumber: 'MER-304' },
  { id: 11, name: 'Ahmedabad → Surat', fare: 280, travelTime: 3, category: 'Short Distance', trainNumber: 'GUJ-104' },
  { id: 12, name: 'Lucknow → Kanpur', fare: 200, travelTime: 2, category: 'Short Distance', trainNumber: 'AVD-105' }
];

function App() {
  const [activeTab, setActiveTab] = useState<'routes' | 'simulation'>('routes');
  const [cartItems, setCartItems] = useState<TrainRoute[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nextBookingId, setNextBookingId] = useState(1);
  const [passengerName, setPassengerName] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [results, setResults] = useState<SchedulingResult[]>([]);
  const [simulation, setSimulation] = useState<SimulationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1000);
  const intervalRef = useRef<NodeJS.Timeout>();

  // FCFS Scheduling Algorithm - processes bookings in arrival order
  const calculateFCFS = (bookingList: Booking[]): { results: SchedulingResult[], simulation: SimulationStep[] } => {
    if (bookingList.length === 0) return { results: [], simulation: [] };

    // Sort bookings by arrival time (FCFS principle)
    const sortedBookings = [...bookingList].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const results: SchedulingResult[] = [];
    const simulationSteps: SimulationStep[] = [];
    let currentProcessingTime = 0;

    // Start processing from the first arrival
    const firstArrivalTime = sortedBookings[0].arrivalTime;
    currentProcessingTime = firstArrivalTime;

    sortedBookings.forEach((booking) => {
      // Record arrival event
      simulationSteps.push({
        time: booking.arrivalTime,
        event: 'arrival',
        booking,
        description: `Booking #${booking.id} by ${booking.passengerName} arrives (${booking.routes.length} route(s), ${booking.estimatedTime} hours travel)`
      });

      // Calculate scheduling metrics
      const startTime = Math.max(currentProcessingTime, booking.arrivalTime);
      const completionTime = startTime + booking.estimatedTime;
      const waitTime = startTime - booking.arrivalTime;
      const turnaroundTime = completionTime - booking.arrivalTime;
      const responseTime = waitTime; // In FCFS, response time equals wait time

      // Record start processing event
      if (startTime > booking.arrivalTime) {
        simulationSteps.push({
          time: startTime,
          event: 'start',
          booking,
          description: `Booking #${booking.id} starts processing after waiting ${waitTime} hours`
        });
      } else {
        simulationSteps.push({
          time: startTime,
          event: 'start',
          booking,
          description: `Booking #${booking.id} starts processing immediately (no wait time)`
        });
      }

      // Record completion event
      simulationSteps.push({
        time: completionTime,
        event: 'complete',
        booking,
        description: `Booking #${booking.id} completed (turnaround time: ${turnaroundTime} hours)`
      });

      results.push({
        booking,
        arrivalTime: booking.arrivalTime,
        startTime,
        completionTime,
        waitTime,
        turnaroundTime,
        responseTime
      });

      currentProcessingTime = completionTime;
    });

    // Sort simulation steps chronologically
    simulationSteps.sort((a, b) => a.time - b.time);

    return { results, simulation: simulationSteps };
  };

  // Add route to cart
  const addToCart = (routeId: number) => {
    const route = trainRoutes.find(r => r.id === routeId);
    if (route) {
      setCartItems([...cartItems, route]);
    }
  };

  // Remove route from cart
  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Submit booking
  const submitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (passengerName && cartItems.length > 0) {
      const newBooking: Booking = {
        id: nextBookingId,
        passengerName,
        routes: [...cartItems],
        arrivalTime: currentTime,
        estimatedTime: cartItems.reduce((sum, route) => sum + route.travelTime, 0),
        status: 'waiting'
      };

      setBookings([...bookings, newBooking]);
      setCartItems([]);
      setPassengerName('');
      setNextBookingId(nextBookingId + 1);
      setCurrentTime(currentTime + Math.floor(Math.random() * 2) + 1); // Random arrival gap 1-2 hours
    }
  };

  // Update simulation when bookings change
  useEffect(() => {
    const { results: newResults, simulation: newSimulation } = calculateFCFS(bookings);
    setResults(newResults);
    setSimulation(newSimulation);
    setCurrentStep(0);
    setIsPlaying(false);
  }, [bookings]);

  // Animation loop for simulation playback
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

  // Toggle simulation play/pause
  const toggleSimulation = () => {
    if (simulation.length === 0) return;
    setIsPlaying(!isPlaying);
  };

  // Reset simulation to beginning
  const resetSimulation = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  // Calculate overall statistics
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
      totalBookings: results.length,
      totalTime: results.length > 0 ? Math.max(...results.map(r => r.completionTime)) : 0
    };
  };

  const stats = calculateStatistics();

  // Get bookings by current status in simulation
  const getBookingsByStatus = () => {
    const currentSimTime = simulation[currentStep]?.time || 0;
    const waiting: Booking[] = [];
    const processing: Booking[] = [];
    const completed: Booking[] = [];

    bookings.forEach(booking => {
      const result = results.find(r => r.booking.id === booking.id);
      if (result) {
        if (currentSimTime < result.startTime) {
          waiting.push(booking);
        } else if (currentSimTime >= result.startTime && currentSimTime < result.completionTime) {
          processing.push(booking);
        } else if (currentSimTime >= result.completionTime) {
          completed.push(booking);
        }
      }
    });

    return { waiting, processing, completed };
  };

  const { waiting, processing, completed } = getBookingsByStatus();

  // Calculate total fare collected per train route
  const calculateFarePerTrain = () => {
    const fareMap: Record<string, number> = {};
    
    bookings.forEach(booking => {
      booking.routes.forEach(route => {
        if (!fareMap[route.name]) {
          fareMap[route.name] = 0;
        }
        fareMap[route.name] += route.fare;
      });
    });

    return Object.entries(fareMap).map(([name, fare]) => ({
      name,
      fare
    }));
  };

  const fareData = calculateFarePerTrain();

  // Group train routes by category
  const groupedRoutes = trainRoutes.reduce((acc, route) => {
    if (!acc[route.category]) acc[route.category] = [];
    acc[route.category].push(route);
    return acc;
  }, {} as Record<string, TrainRoute[]>);

  const cartTotal = cartItems.reduce((sum, route) => sum + route.fare, 0);
  const cartTime = cartItems.reduce((sum, route) => sum + route.travelTime, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-blue-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Train className="h-10 w-10 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">RailwayTicketOS</h1>
                <p className="text-sm text-gray-600">FCFS Booking System</p>
              </div>
            </div>
            
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('routes')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'routes' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🚂 Routes & Bookings
              </button>
              <button
                onClick={() => setActiveTab('simulation')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'simulation' 
                    ? 'bg-blue-600 text-white shadow-lg' 
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
        {activeTab === 'routes' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Routes Section */}
            <div className="lg:col-span-2">
              <div className="mb-8">
                <h2 className="text-4xl font-bold text-gray-800 mb-2">Available Train Routes</h2>
                <p className="text-gray-600">Select routes to create a booking and demonstrate FCFS scheduling</p>
              </div>

              {Object.entries(groupedRoutes).map(([category, routes]) => (
                <div key={category} className="mb-8">
                  <h3 className="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-blue-200">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {routes.map(route => (
                      <div key={route.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200">
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800">{route.name}</h4>
                              <p className="text-xs text-gray-500 mt-1">Train: {route.trainNumber}</p>
                            </div>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-xs font-medium">
                              {category}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-xl font-bold text-green-600">₹{route.fare}</span>
                            <span className="text-blue-600 font-medium flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {route.travelTime}h
                            </span>
                          </div>
                          <button
                            onClick={() => addToCart(route.id)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add to Booking</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Booking Cart Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
                <div className="flex items-center space-x-3 mb-6">
                  <Ticket className="h-6 w-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-800">Booking Cart</h3>
                </div>

                <div className="max-h-60 overflow-y-auto mb-4">
                  {cartItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Your cart is empty</p>
                  ) : (
                    cartItems.map((route, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-2">
                        <div>
                          <h4 className="font-medium text-gray-800">{route.name}</h4>
                          <p className="text-sm text-gray-600">₹{route.fare} • {route.travelTime}h</p>
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
                        <span className="font-medium">Total Fare:</span>
                        <span className="font-bold text-green-600">₹{cartTotal}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Total Travel:</span>
                        <span className="font-bold text-blue-600">{cartTime} hours</span>
                      </div>
                    </div>

                    <form onSubmit={submitBooking} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Passenger Name
                        </label>
                        <input
                          type="text"
                          value={passengerName}
                          onChange={(e) => setPassengerName(e.target.value)}
                          placeholder="Enter passenger name"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                      >
                        Book Ticket (Arrives at {currentTime}h)
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
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
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
                  <span>Step {currentStep + 1} of {simulation.length} | Time: {simulation[currentStep]?.time || 0} hours</span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${simulation.length > 0 ? ((currentStep + 1) / simulation.length) * 100 : 0}%` }}
                  ></div>
                </div>
                
                {/* Current Event Display */}
                {simulation[currentStep] && (
                  <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-600 rounded">
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
                  <p className="text-2xl font-bold text-blue-600 mb-1">{stats.avgWaitTime}h</p>
                  <p className="text-xs text-gray-500">Range: {stats.minWaitTime}h - {stats.maxWaitTime}h</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Average Turnaround Time (ATT)</h3>
                  <p className="text-2xl font-bold text-green-600 mb-1">{stats.avgTurnaroundTime}h</p>
                  <p className="text-xs text-gray-500">Range: {stats.minTurnaroundTime}h - {stats.maxTurnaroundTime}h</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Total Bookings</h3>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalBookings}</p>
                  <p className="text-xs text-gray-500">In simulation</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Total Time</h3>
                  <p className="text-2xl font-bold text-orange-600">{stats.totalTime}h</p>
                  <p className="text-xs text-gray-500">Simulation duration</p>
                </div>
              </div>
            )}

            {/* Fare Collection Bar Chart */}
            {fareData.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Total Fare Collected per Train Route
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={fareData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis label={{ value: 'Fare (₹)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value) => [`₹${value}`, 'Total Fare']}
                      contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                    <Bar dataKey="fare" fill="#3b82f6" name="Total Fare Collected (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gantt Chart */}
            {results.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Gantt Chart - FCFS Booking Processing Timeline
                </h3>
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Time scale */}
                    <div className="flex border-b border-gray-200 pb-2 mb-4">
                      <div className="w-40 text-sm font-medium text-gray-600">Time Scale (hours):</div>
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
                      const execWidth = (result.booking.estimatedTime / maxTime) * 100;
                      const startOffset = (result.startTime / maxTime) * 100;

                      return (
                        <div key={result.booking.id} className="flex items-center mb-4">
                          <div className="w-40 text-sm font-medium text-gray-700">
                            <div>Booking #{result.booking.id}</div>
                            <div className="text-xs text-gray-500">{result.booking.passengerName}</div>
                          </div>
                          <div className="flex-1 relative h-10 bg-gray-100 rounded border">
                            {/* Arrival marker */}
                            <div
                              className="absolute top-0 w-1 h-full bg-blue-600 z-10"
                              style={{ left: `${arrivalOffset}%` }}
                              title={`Arrival: ${result.arrivalTime}h`}
                            />
                            
                            {/* Wait time (red bar) */}
                            {result.waitTime > 0 && (
                              <div
                                className="absolute h-full bg-red-300 border-2 border-red-500 rounded-l flex items-center justify-center"
                                style={{
                                  left: `${arrivalOffset}%`,
                                  width: `${waitWidth}%`
                                }}
                                title={`Wait Time: ${result.waitTime}h`}
                              >
                                {result.waitTime > 0 && waitWidth > 8 && (
                                  <span className="text-xs font-medium text-red-800">
                                    Wait: {result.waitTime}h
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
                              title={`Processing: ${result.booking.estimatedTime}h`}
                            >
                              {execWidth > 10 && (
                                <span className="text-xs font-medium text-green-800">
                                  Process: {result.booking.estimatedTime}h
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-24 text-xs text-gray-600 ml-2 text-center">
                            <div>Start: {result.startTime}h</div>
                            <div>End: {result.completionTime}h</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Legend */}
                <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
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
              {/* Waiting Bookings */}
              <div className="bg-yellow-50 rounded-xl shadow-lg p-6 border-2 border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                  ⏳ Waiting Queue ({waiting.length})
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {waiting.map(booking => (
                    <div
                      key={booking.id}
                      className="bg-white p-4 rounded-lg shadow border-2 border-yellow-300 animate-bounce"
                      style={{
                        animationDuration: '2s',
                        animationIterationCount: 'infinite'
                      }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">Booking #{booking.id}</span>
                        <span className="text-sm text-gray-600">{booking.estimatedTime}h travel</span>
                      </div>
                      <p className="text-sm text-gray-600">{booking.passengerName}</p>
                      <p className="text-xs text-gray-500">{booking.routes.length} route(s) • Arrived at {booking.arrivalTime}h</p>
                      <div className="mt-2 text-xs text-yellow-700 font-medium">
                        🕐 Waiting in queue...
                      </div>
                    </div>
                  ))}
                  {waiting.length === 0 && (
                    <p className="text-yellow-600 text-center py-8">No bookings waiting</p>
                  )}
                </div>
              </div>

              {/* Processing Bookings */}
              <div className="bg-blue-50 rounded-xl shadow-lg p-6 border-2 border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                  🔄 Currently Processing ({processing.length})
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {processing.map(booking => {
                    const result = results.find(r => r.booking.id === booking.id);
                    const currentSimTime = simulation[currentStep]?.time || 0;
                    const progress = result ? ((currentSimTime - result.startTime) / booking.estimatedTime) * 100 : 0;
                    
                    return (
                      <div
                        key={booking.id}
                        className="bg-white p-4 rounded-lg shadow border-2 border-blue-300 animate-pulse"
                        style={{
                          animationDuration: '1.5s',
                          animationIterationCount: 'infinite'
                        }}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-800">Booking #{booking.id}</span>
                          <span className="text-sm text-gray-600">{booking.estimatedTime}h total</span>
                        </div>
                        <p className="text-sm text-gray-600">{booking.passengerName}</p>
                        <p className="text-xs text-gray-500">{booking.routes.length} route(s)</p>
                        {result && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-blue-700 mb-1">
                              <span>Processing...</span>
                              <span>{Math.min(100, Math.max(0, progress)).toFixed(0)}%</span>
                            </div>
                            <div className="bg-blue-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {processing.length === 0 && (
                    <p className="text-blue-600 text-center py-8">No bookings being processed</p>
                  )}
                </div>
              </div>

              {/* Completed Bookings */}
              <div className="bg-green-50 rounded-xl shadow-lg p-6 border-2 border-green-200">
                <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                  ✅ Completed ({completed.length})
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {completed.map(booking => {
                    const result = results.find(r => r.booking.id === booking.id);
                    return (
                      <div
                        key={booking.id}
                        className="bg-white p-4 rounded-lg shadow border-2 border-green-300 animate-fade-in opacity-100"
                        style={{
                          animation: 'fadeIn 0.5s ease-in'
                        }}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-800">Booking #{booking.id}</span>
                          <span className="text-sm text-green-600 font-medium">✓ Done</span>
                        </div>
                        <p className="text-sm text-gray-600">{booking.passengerName}</p>
                        <p className="text-xs text-gray-500">{booking.routes.length} route(s)</p>
                        {result && (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-yellow-100 p-1 rounded text-center">
                              <div className="font-medium text-yellow-800">Wait</div>
                              <div className="text-yellow-600">{result.waitTime}h</div>
                            </div>
                            <div className="bg-green-100 p-1 rounded text-center">
                              <div className="font-medium text-green-800">Total</div>
                              <div className="text-green-600">{result.turnaroundTime}h</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {completed.length === 0 && (
                    <p className="text-green-600 text-center py-8">No bookings completed yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Booking Analysis */}
            {results.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Detailed Booking Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map(result => (
                    <div key={result.booking.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium text-gray-800">Booking #{result.booking.id}</span>
                        <span className="text-sm text-gray-600">{result.booking.passengerName}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-100 p-2 rounded text-center">
                          <div className="text-xs font-medium text-blue-800">Arrival</div>
                          <div className="text-sm font-bold text-blue-600">{result.arrivalTime}h</div>
                        </div>
                        <div className="bg-yellow-100 p-2 rounded text-center">
                          <div className="text-xs font-medium text-yellow-800">Wait Time</div>
                          <div className="text-sm font-bold text-yellow-600">{result.waitTime}h</div>
                        </div>
                        <div className="bg-green-100 p-2 rounded text-center">
                          <div className="text-xs font-medium text-green-800">Travel Time</div>
                          <div className="text-sm font-bold text-green-600">{result.booking.estimatedTime}h</div>
                        </div>
                        <div className="bg-purple-100 p-2 rounded text-center">
                          <div className="text-xs font-medium text-purple-800">Turnaround</div>
                          <div className="text-sm font-bold text-purple-600">{result.turnaroundTime}h</div>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        Start: {result.startTime}h → End: {result.completionTime}h
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Algorithm Explanation */}
            <div className="bg-blue-50 rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
              <h3 className="text-xl font-semibold text-blue-800 mb-4">🎓 FCFS Algorithm Explanation</h3>
              <div className="space-y-3 text-blue-700">
                <p><strong>How it works:</strong> Bookings are processed in the exact order they arrive - first come, first served.</p>
                <p><strong>Key Calculations:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Wait Time:</strong> Start Time - Arrival Time</li>
                  <li><strong>Turnaround Time:</strong> Completion Time - Arrival Time</li>
                  <li><strong>Response Time:</strong> Same as Wait Time in FCFS</li>
                  <li><strong>Average Wait Time (AWT):</strong> Sum of all wait times ÷ Number of bookings</li>
                  <li><strong>Average Turnaround Time (ATT):</strong> Sum of all turnaround times ÷ Number of bookings</li>
                </ul>
                <p><strong>Advantages:</strong> Simple, fair, no starvation, easy to implement</p>
                <p><strong>Disadvantages:</strong> Can lead to convoy effect where short bookings wait behind long ones</p>
                <p><strong>Real-world Application:</strong> Perfect for ticket booking systems where fairness is prioritized - whoever arrives first gets served first</p>
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
