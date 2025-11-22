import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Bank {
  id: string;
  name: string;
}

interface Bet {
  id: string;
  amount: number;
  odds: number;
  status: "won" | "lost" | "open";
  description: string | null;
  profit: number | null;
  bet_date: string;
}

const DailyBets = () => {
  const { toast } = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanks();
  }, []);

  useEffect(() => {
    if (selectedBank && selectedDate) {
      fetchBets();
    }
  }, [selectedBank, selectedDate]);

  const fetchBanks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("banks")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBanks(data || []);
      if (data && data.length > 0) {
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

  const fetchBets = async () => {
    try {
      const { data, error } = await supabase
        .from("bets")
        .select("*")
        .eq("bank_id", selectedBank)
        .eq("bet_date", selectedDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBets(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cargar las apuestas",
      });
    }
  };

  const updateBetStatus = async (betId: string, newStatus: "won" | "lost" | "open") => {
    try {
      const { error } = await supabase
        .from("bets")
        .update({ status: newStatus })
        .eq("id", betId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: "El estado de la apuesta se actualizó correctamente",
      });

      fetchBets();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al actualizar el estado",
      });
    }
  };

  const calculateDailySummary = () => {
    return bets.reduce(
      (acc, bet) => {
        acc.total++;
        if (bet.status === "won") {
          acc.won++;
          acc.profit += bet.profit || 0;
        } else if (bet.status === "lost") {
          acc.lost++;
          acc.profit += bet.profit || 0;
        }
        acc.wagered += bet.amount;
        return acc;
      },
      { total: 0, won: 0, lost: 0, profit: 0, wagered: 0 }
    );
  };

  const summary = calculateDailySummary();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "won":
        return <Badge className="bg-success text-success-foreground">Ganada</Badge>;
      case "lost":
        return <Badge className="bg-danger text-danger-foreground">Perdida</Badge>;
      default:
        return <Badge variant="outline">Abierta</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Cargando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Apuestas del Día</h1>
          <p className="text-muted-foreground">Consulta tus apuestas por fecha</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank-select">Bank</Label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger id="bank-select">
                    <SelectValue placeholder="Seleccionar bank" />
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
              <div className="space-y-2">
                <Label htmlFor="date-select">Fecha</Label>
                <Input
                  id="date-select"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Apuestas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-success" />
                Ganadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{summary.won}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-4 w-4 text-danger" />
                Perdidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-danger">{summary.lost}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.profit >= 0 ? "text-success" : "text-danger"}`}>
                ${summary.profit.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bets List */}
        <Card>
          <CardHeader>
            <CardTitle>Apuestas del {new Date(selectedDate + "T00:00:00").toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent>
            {bets.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay apuestas en esta fecha</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bets.map((bet) => (
                  <div
                    key={bet.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(bet.status)}
                          <span className="text-sm text-muted-foreground">
                            Cuota: {bet.odds.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {bet.description || "Sin descripción"}
                        </p>
                        <div className="w-full sm:w-48">
                          <Select value={bet.status} onValueChange={(value) => updateBetStatus(bet.id, value as "won" | "lost" | "open")}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Abierta</SelectItem>
                              <SelectItem value="won">Ganada</SelectItem>
                              <SelectItem value="lost">Perdida</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-1">
                        <div className="text-lg font-semibold">
                          ${bet.amount.toFixed(2)}
                        </div>
                        {bet.profit !== null && bet.status !== "open" && (
                          <div
                            className={`text-sm font-medium ${
                              bet.profit >= 0 ? "text-success" : "text-danger"
                            }`}
                          >
                            {bet.profit >= 0 ? "+" : ""}${bet.profit.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DailyBets;
