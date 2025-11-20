import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus, 
  Calendar,
  Activity,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Bank {
  id: string;
  name: string;
  current_balance: number;
  initial_balance: number;
}

interface DailyStats {
  total_bets: number;
  total_won: number;
  total_lost: number;
  net_profit: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    total_bets: 0,
    total_won: 0,
    total_lost: 0,
    net_profit: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanks();
  }, []);

  useEffect(() => {
    if (selectedBank) {
      fetchDailyStats(selectedBank);
    }
  }, [selectedBank]);

  const fetchBanks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("banks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBanks(data || []);
      if (data && data.length > 0 && !selectedBank) {
        setSelectedBank(data[0].id);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cargar los banks",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyStats = async (bankId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("bets")
        .select("*")
        .eq("bank_id", bankId)
        .eq("bet_date", today);

      if (error) throw error;

      const stats = (data || []).reduce(
        (acc, bet) => {
          acc.total_bets += 1;
          if (bet.status === "won") {
            acc.total_won += 1;
            acc.net_profit += bet.profit || 0;
          } else if (bet.status === "lost") {
            acc.total_lost += 1;
            acc.net_profit += bet.profit || 0;
          }
          return acc;
        },
        { total_bets: 0, total_won: 0, total_lost: 0, net_profit: 0 }
      );

      setDailyStats(stats);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cargar estadísticas",
      });
    }
  };

  const selectedBankData = banks.find((b) => b.id === selectedBank);
  const roi = selectedBankData
    ? ((selectedBankData.current_balance - selectedBankData.initial_balance) /
        selectedBankData.initial_balance) *
      100
    : 0;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Cargando...</div>
        </div>
      </Layout>
    );
  }

  if (banks.length === 0) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto">
          <Card className="text-center py-12">
            <CardContent>
              <Wallet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">No tienes Banks aún</h2>
              <p className="text-muted-foreground mb-6">
                Crea tu primer Bank para comenzar a gestionar tus apuestas
              </p>
              <Button onClick={() => navigate("/banks")}>
                <Plus className="mr-2 h-4 w-4" />
                Crear mi primer Bank
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Resumen de tus apuestas</p>
          </div>
          <Select value={selectedBank} onValueChange={setSelectedBank}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Seleccionar Bank" />
            </SelectTrigger>
            <SelectContent>
              {banks.map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-lg opacity-90">Balance Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">
              ${selectedBankData?.current_balance.toFixed(2)}
            </div>
            <div className="flex items-center gap-4 text-sm opacity-90">
              <span>ROI: {roi.toFixed(2)}%</span>
              <span className="flex items-center gap-1">
                {roi >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {roi >= 0 ? "Ganando" : "Perdiendo"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Apuestas Hoy
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailyStats.total_bets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ganadas
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{dailyStats.total_won}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Perdidas
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-danger" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-danger">{dailyStats.total_lost}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Balance del Día
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${dailyStats.net_profit >= 0 ? "text-success" : "text-danger"}`}>
                ${dailyStats.net_profit.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              onClick={() => navigate("/new-bet")}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Registrar Apuesta
            </Button>
            <Button
              onClick={() => navigate("/daily-bets")}
              variant="outline"
              className="w-full"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Ver Apuestas del Día
            </Button>
            <Button
              onClick={() => navigate("/history")}
              variant="outline"
              className="w-full"
            >
              <Activity className="mr-2 h-4 w-4" />
              Ver Historial
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
