import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
// Inline Separator component
import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import { cn } from "./lib/utils"

const Separator = React.forwardRef(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog';
import { AlertCircle, CheckCircle, Clock, CreditCard, Globe, Shield, Users, TrendingUp, Upload, Copy, Banknote, Smartphone, Download, Share, Star, Zap } from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const REGIONS = [
  'United States', 'Canada', 'United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 
  'Netherlands', 'Australia', 'Japan', 'South Korea', 'Singapore', 'Brazil', 'Mexico'
];

// PWA Install Component
const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('PWA install outcome:', outcome);
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  if (!showInstallButton) {
    return null;
  }

  return (
    <Button
      onClick={handleInstall}
      variant="outline"
      className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
    >
      <Download className="w-4 h-4 mr-2" />
      Install App
    </Button>
  );
};

// Apple Pay Mock Implementation
const MockApplePay = ({ amount, onSuccess, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApplePayClick = async () => {
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(`${BACKEND_URL}/api/apple-pay/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apple_pay_token: { mock: true },
          amount: amount,
          currency: 'EUR'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        onSuccess(result);
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      onError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handleApplePayClick}
      disabled={isProcessing}
      className="w-full bg-black text-white hover:bg-gray-900 py-4 rounded-xl font-medium text-lg"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      {isProcessing ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Processing...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <Smartphone className="w-5 h-5" />
          <span>Pay</span>
        </div>
      )}
    </Button>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({});
  const [bankInfo, setBankInfo] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [paymentProof, setPaymentProof] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStandalone, setIsStandalone] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    current_region: '',
    target_region: '',
    balance_amount: '',
    description: ''
  });

  useEffect(() => {
    setIsStandalone(
      window.navigator.standalone || 
      window.matchMedia('(display-mode: standalone)').matches
    );

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile(token);
    }
    fetchBankInfo();
  }, []);

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchStats();
    }
  }, [user]);

  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      localStorage.removeItem('token');
    }
  };

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchBankInfo = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/bank-info`);
      if (response.ok) {
        const data = await response.json();
        setBankInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch bank info:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const payload = authMode === 'login' 
        ? { email: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password, name: formData.name };

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        setUser(data.user);
        setFormData({ name: '', email: '', password: '', current_region: '', target_region: '', balance_amount: '', description: '' });
      } else {
        const error = await response.json();
        alert(error.detail || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_region: formData.current_region,
          target_region: formData.target_region,
          balance_amount: parseFloat(formData.balance_amount),
          description: formData.description
        })
      });

      if (response.ok) {
        alert('Service request created successfully! Please proceed to payment.');
        setFormData({ ...formData, current_region: '', target_region: '', balance_amount: '', description: '' });
        fetchRequests();
        setActiveTab('dashboard');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to create request');
      }
    } catch (error) {
      console.error('Request creation error:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPaymentProof(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitBankTransferPayment = async () => {
    if (!selectedRequest || !paymentProof) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/requests/${selectedRequest.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payment_method: 'bank_transfer',
          payment_reference: paymentReference,
          payment_proof: paymentProof
        })
      });

      if (response.ok) {
        alert('Bank transfer confirmation submitted successfully!');
        setShowPaymentDialog(false);
        setPaymentProof(null);
        setPaymentReference('');
        fetchRequests();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to submit payment');
      }
    } catch (error) {
      console.error('Payment submission error:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplePaySuccess = async (paymentResult) => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/requests/${selectedRequest.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payment_method: 'apple_pay',
          payment_reference: paymentResult.transaction_id
        })
      });

      if (response.ok) {
        alert('Apple Pay payment successful!');
        setShowPaymentDialog(false);
        fetchRequests();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const shareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AppleZero - Zero Your Apple Store Account',
          text: 'Switch between regional Apple Stores seamlessly!',
          url: window.location.origin
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      copyToClipboard(window.location.origin);
      alert('Link copied to clipboard!');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setRequests([]);
    setActiveTab('dashboard');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'payment_verification': return <CreditCard className="w-4 h-4 text-purple-500" />;
      case 'pending_payment': return <Banknote className="w-4 h-4 text-orange-500" />;
      case 'pending': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'payment_verification': return 'bg-purple-100 text-purple-800';
      case 'pending_payment': return 'bg-orange-100 text-orange-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending_payment': return 'Pending Payment';
      case 'payment_verification': return 'Payment Verification';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {!isOnline && (
          <div className="bg-red-600 text-white text-center py-2 text-sm">
            You're offline. Some features may not work.
          </div>
        )}

        <header className="border-b border-slate-700/50 bg-black/20 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">AppleZero</h1>
                {isStandalone && (
                  <Badge className="bg-green-500 text-white">PWA</Badge>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <PWAInstallButton />
                <Button 
                  onClick={shareApp}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </header>

        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1668984862920-1957a901a173" 
              alt="Apple Store" 
              className="w-full h-full object-cover opacity-20"
            />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Star className="w-5 h-5 text-yellow-500" />
                <Star className="w-5 h-5 text-yellow-500" />
                <Star className="w-5 h-5 text-yellow-500" />
                <Star className="w-5 h-5 text-yellow-500" />
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="text-slate-300 ml-2">Trusted by 250+ users</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Zero Your Apple Store
                <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  {' '}Account Balance
                </span>
              </h1>
              <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                Switch between regional Apple Stores seamlessly. Transfer your account balance 
                to our secure platform and gain the freedom to shop in any region.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button 
                  onClick={() => setAuthMode('register')}
                  size="lg" 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Get Started Free
                </Button>
                <Button 
                  onClick={() => setAuthMode('login')}
                  variant="outline" 
                  size="lg"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-3 rounded-xl font-semibold"
                >
                  Sign In
                </Button>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <Badge className="bg-slate-700 text-slate-300">📱 Install as App</Badge>
                <Badge className="bg-slate-700 text-slate-300">⚡ Works Offline</Badge>
                <Badge className="bg-slate-700 text-slate-300">🔔 Push Notifications</Badge>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-black/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Why Choose AppleZero?</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                The fastest and most secure way to manage your Apple Store regional accounts
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <Shield className="w-12 h-12 text-blue-500 mb-4" />
                  <CardTitle className="text-white">Secure & Safe</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">
                    Your data is protected with enterprise-level security. We never store your Apple credentials.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CreditCard className="w-12 h-12 text-purple-500 mb-4" />
                  <CardTitle className="text-white">Multiple Payment Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">
                    Support for Apple Pay and secure bank transfers. Choose your preferred method.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <Users className="w-12 h-12 text-green-500 mb-4" />
                  <CardTitle className="text-white">24/7 Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">
                    Our expert team is available around the clock to help with your account transfer.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-white mb-2">{stats.total_requests || 0}</div>
                <div className="text-slate-400">Total Requests</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-500 mb-2">{stats.success_rate || 0}%</div>
                <div className="text-slate-400">Success Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-500 mb-2">14</div>
                <div className="text-slate-400">Supported Regions</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-500 mb-2">24h</div>
                <div className="text-slate-400">Average Processing</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-black/30 backdrop-blur-sm">
          <div className="max-w-md mx-auto px-4">
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">
                  {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {authMode === 'login' 
                    ? 'Sign in to manage your account transfers' 
                    : 'Join thousands who have successfully switched regions'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === 'register' && (
                    <div>
                      <Label htmlFor="name" className="text-slate-300">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading || !isOnline}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    {loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
                  </Button>
                </form>
                <div className="text-center mt-4">
                  <button
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    {authMode === 'login' 
                      ? "Don't have an account? Sign up" 
                      : 'Already have an account? Sign in'
                    }
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="border-t border-slate-700/50 bg-black/20 backdrop-blur-xl py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">AppleZero</h3>
              </div>
              <p className="text-slate-400 mb-4">
                Making Apple Store regional switching simple and secure
              </p>
              <p className="text-sm text-slate-500">
                © 2025 AppleZero. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Dashboard view for logged-in users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {!isOnline && (
        <div className="bg-red-600 text-white text-center py-2 text-sm">
          You're offline. Some features may not work.
        </div>
      )}

      <header className="border-b border-slate-700/50 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">AppleZero</h1>
              {isStandalone && (
                <Badge className="bg-green-500 text-white">PWA</Badge>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-300">Welcome, {user.name}</span>
              <Button 
                onClick={shareApp}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                <Share className="w-4 h-4" />
              </Button>
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800 border-slate-700 mb-8">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-slate-700">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="new-request" className="data-[state=active]:bg-slate-700">
              New Request
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">Total Requests</CardTitle>
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{requests.length}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">Pending Payment</CardTitle>
                    <Banknote className="w-4 h-4 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {requests.filter(r => r.status === 'pending_payment').length}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">Processing</CardTitle>
                    <Clock className="w-4 h-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {requests.filter(r => ['processing', 'payment_verification'].includes(r.status)).length}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">Completed</CardTitle>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {requests.filter(r => r.status === 'completed').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Your Account Transfer Requests</CardTitle>
                <CardDescription className="text-slate-400">
                  Track the status of your Apple Store region changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-8">
                    <Globe className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">No transfer requests yet</p>
                    <Button 
                      onClick={() => setActiveTab('new-request')}
                      className="bg-gradient-to-r from-blue-500 to-purple-600"
                    >
                      Create Your First Request
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(request.status)}
                          <div>
                            <div className="text-white font-medium">
                              {request.current_region} → {request.target_region}
                            </div>
                            <div className="text-slate-400 text-sm">
                              Balance: €{request.balance_amount} • {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(request.status)}>
                            {getStatusText(request.status)}
                          </Badge>
                          {request.status === 'pending_payment' && (
                            <Button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowPaymentDialog(true);
                              }}
                              disabled={!isOnline}
                              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 text-sm"
                            >
                              Pay Now
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="new-request">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Create New Transfer Request</CardTitle>
                <CardDescription className="text-slate-400">
                  Submit your Apple Store account balance for regional transfer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRequest} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="current_region" className="text-slate-300">Current Region</Label>
                      <Select 
                        value={formData.current_region} 
                        onValueChange={(value) => setFormData({...formData, current_region: value})}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Select current region" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIONS.map((region) => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="target_region" className="text-slate-300">Target Region</Label>
                      <Select 
                        value={formData.target_region} 
                        onValueChange={(value) => setFormData({...formData, target_region: value})}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Select target region" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIONS.filter(region => region !== formData.current_region).map((region) => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="balance_amount" className="text-slate-300">Account Balance (€EUR)</Label>
                    <Input
                      id="balance_amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formData.balance_amount}
                      onChange={(e) => setFormData({...formData, balance_amount: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Enter your current Apple Store balance"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-slate-300">Additional Notes (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Any specific requirements or notes..."
                      rows={3}
                    />
                  </div>

                  <Separator className="bg-slate-600" />
                  
                  <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                    <h4 className="text-white font-medium mb-2">What happens next?</h4>
                    <ul className="text-slate-400 text-sm space-y-1">
                      <li>1. Submit your transfer request</li>
                      <li>2. Choose payment method (Apple Pay or Bank Transfer)</li>
                      <li>3. We verify your payment within 24 hours</li>
                      <li>4. Your Apple Store account is processed for regional change</li>
                    </ul>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading || !isOnline || !formData.current_region || !formData.target_region || !formData.balance_amount}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    size="lg"
                  >
                    {loading ? 'Creating Request...' : 'Submit Transfer Request'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription className="text-slate-400">
              Pay €{selectedRequest?.balance_amount} for your Apple Store region transfer
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="apple-pay" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700">
              <TabsTrigger value="apple-pay">Apple Pay</TabsTrigger>
              <TabsTrigger value="bank-transfer">Bank Transfer</TabsTrigger>
            </TabsList>
            
            <TabsContent value="apple-pay" className="space-y-4 mt-6">
              <div className="text-center py-8">
                <Smartphone className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-4">Pay with Apple Pay</h3>
                <p className="text-slate-400 mb-6">
                  Quick and secure payment using your Apple device
                </p>
                <MockApplePay 
                  amount={selectedRequest?.balance_amount || 0}
                  onSuccess={handleApplePaySuccess}
                  onError={(error) => alert('Apple Pay failed: ' + error)}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="bank-transfer" className="space-y-6 mt-6">
              <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Banknote className="w-5 h-5 mr-2" />
                  Transfer Details
                </h3>
                {bankInfo && (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Beneficiary:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{bankInfo.beneficiary}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(bankInfo.beneficiary)}
                          className="p-1 h-auto"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">IBAN:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{bankInfo.iban}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(bankInfo.iban)}
                          className="p-1 h-auto"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">BIC/SWIFT:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{bankInfo.bic_swift}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(bankInfo.bic_swift)}
                          className="p-1 h-auto"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Bank:</span>
                      <span>{bankInfo.bank_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Amount:</span>
                      <span className="font-bold text-green-400">€{selectedRequest?.balance_amount}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="payment_reference" className="text-slate-300">Payment Reference (Optional)</Label>
                  <Input
                    id="payment_reference"
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID or reference number"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                
                <div>
                  <Label htmlFor="payment_proof" className="text-slate-300">Upload Payment Proof *</Label>
                  <div className="mt-2">
                    <label htmlFor="payment_proof" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer hover:border-slate-500">
                      {paymentProof ? (
                        <img src={paymentProof} alt="Payment proof" className="max-h-24 max-w-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-10 h-10 text-slate-400 mb-2" />
                          <p className="text-sm text-slate-400">Click to upload payment screenshot</p>
                        </div>
                      )}
                      <input
                        id="payment_proof"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                
                <Button
                  onClick={submitBankTransferPayment}
                  disabled={loading || !paymentProof || !isOnline}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  {loading ? 'Submitting...' : 'Confirm Bank Transfer'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
