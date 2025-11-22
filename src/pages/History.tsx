import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import { History as HistoryIcon, ChevronLeft, ChevronRight } from "lucide-react";
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
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

const History = () => {
  const { toast } = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "won" | "lost" | "open">("all");
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBets, setTotalBets] = useState(0);

  useEffect(() => {
    fetchBanks();
  }, []);

  useEffect(() => {
    if (selectedBank) {
      fetchBets();
    }
  }, [selectedBank, statusFilter, currentPage]);

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
      let query = supabase
        .from("bets")
        .select("*", { count: "exact" })
        .eq("bank_id", selectedBank);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error, count } = await query
        .order("bet_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      setBets(data || []);
      setTotalBets(count || 0);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cargar el historial",
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

  const totalPages = Math.ceil(totalBets / ITEMS_PER_PAGE);

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
          <h1 className="text-3xl font-bold text-foreground">Historial de Apuestas</h1>
          <p className="text-muted-foreground">Todas tus apuestas registradas</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bank</label>
                <Select value={selectedBank} onValueChange={(value) => {
                  setSelectedBank(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger>
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
                <label className="text-sm font-medium">Filtrar por estado</label>
                <Select value={statusFilter} onValueChange={(value: "all" | "won" | "lost" | "open") => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="won">Ganadas</SelectItem>
                    <SelectItem value="lost">Perdidas</SelectItem>
                    <SelectItem value="open">Abiertas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bets List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Historial {statusFilter !== "all" && `- ${statusFilter === "won" ? "Ganadas" : statusFilter === "lost" ? "Perdidas" : "Abiertas"}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bets.length === 0 ? (
              <div className="text-center py-12">
                <HistoryIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay apuestas registradas</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
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
                              {new Date(bet.bet_date + "T00:00:00").toLocaleDateString()}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              • Cuota: {bet.odds.toFixed(2)}
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
                          {bet.status === "won" && (
                            <div className="text-xs text-muted-foreground">
                              Posible ganancia: ${((bet.amount * bet.odds) - bet.amount).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages} ({totalBets} apuestas)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default History;
