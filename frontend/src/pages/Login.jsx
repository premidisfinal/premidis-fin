import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1514905565314-fea02285fa69?crop=entropy&cs=srgb&fm=jpg&q=85)'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-secondary/80 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md animate-slide-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/20">
            {/* PREMIDIS Logo SVG */}
            <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M25 80 C10 80 10 50 25 35 C35 25 55 25 55 45 C55 60 40 60 35 55 C30 50 35 40 45 40" stroke="#14B8A6" strokeWidth="8" strokeLinecap="round" fill="none"/>
              <path d="M30 35 L30 20" stroke="#14B8A6" strokeWidth="8" strokeLinecap="round"/>
              <path d="M75 20 C90 20 90 50 75 65 C65 75 45 75 45 55 C45 40 60 40 65 45 C70 50 65 60 55 60" stroke="#8B5CF6" strokeWidth="8" strokeLinecap="round" fill="none"/>
              <path d="M70 65 L70 80" stroke="#8B5CF6" strokeWidth="8" strokeLinecap="round"/>
            </svg>
            <div className="text-white">
              <h1 className="text-2xl font-bold">PREMIDIS SARL</h1>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="glass-effect border-white/20 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">{t('login')}</CardTitle>
            <CardDescription>
              Entrez vos identifiants pour accéder à votre compte
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemple@premierdis.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="login-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  {t('forgotPassword')}
                </Link>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full h-11" 
                disabled={loading}
                data-testid="login-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  t('login')
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('noAccount')}{' '}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  {t('createAccount')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
