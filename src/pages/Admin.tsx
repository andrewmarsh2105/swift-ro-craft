import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, Search, Shield, Loader2 } from 'lucide-react';

interface UserResult {
  id: string;
  email: string;
  hasOverride: boolean;
  createdAt: string;
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data, error } = await supabase.functions.invoke('admin-manage-overrides', {
          body: { action: 'check-admin' },
        });
        if (error || !data?.isAdmin) {
          navigate('/', { replace: true });
          return;
        }
        setIsAdmin(true);
      } catch {
        navigate('/', { replace: true });
      } finally {
        setCheckingAdmin(false);
      }
    }
    if (user) checkAdmin();
  }, [user, navigate]);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-overrides', {
        body: { action: 'search', email: searchEmail.trim() },
      });
      if (error) throw error;
      setUsers(data.users || []);
      if ((data.users || []).length === 0) {
        toast.info('No users found matching that email');
      }
    } catch (err: any) {
      toast.error(err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleToggle = async (userId: string, enabled: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(userId));
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-overrides', {
        body: { action: 'toggle', userId, enabled },
      });
      if (error) throw error;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, hasOverride: enabled } : u))
      );
      toast.success(enabled ? 'Pro override enabled' : 'Pro override removed');
    } catch (err: any) {
      toast.error(err.message || 'Toggle failed');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Admin — Pro Overrides</h1>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Users</CardTitle>
            <CardDescription>Find users by email to manage their Pro status</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={searching || !searchEmail.trim()}>
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Search</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {users.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Results ({users.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden sm:table-cell">User ID</TableHead>
                    <TableHead className="text-right">Pro Override</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground font-mono">
                        {u.id.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={u.hasOverride}
                          onCheckedChange={(checked) => handleToggle(u.id, checked)}
                          disabled={togglingIds.has(u.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
