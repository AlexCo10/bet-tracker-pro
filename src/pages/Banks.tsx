import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Bank {
  id: string;
  name: string;
  initial_balance: number;
  current_balance: number;
  created_at: string;
}

const Banks = () => {
  const { toast } = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newBankBalance, setNewBankBalance] = useState("");

  useEffect(() => {
    fetchBanks();
  }, []);

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

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();

    const balance = parseFloat(newBankBalance);
    if (isNaN(balance) || balance < 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El balance debe ser un número positivo",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from("banks").insert({
        user_id: session.user.id,
        name: newBankName,
        initial_balance: balance,
        current_balance: balance,
      });

      if (error) throw error;

      toast({
        title: "Bank creado",
        description: "Tu nuevo bank ha sido creado exitosamente",
      });

      setNewBankName("");
      setNewBankBalance("");
      setIsDialogOpen(false);
      fetchBanks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al crear el bank",
      });
    }
  };

  const handleDeleteBank = async (bankId: string) => {
    try {
      const { error } = await supabase.from("banks").delete().eq("id", bankId);

      if (error) throw error;

      toast({
        title: "Bank eliminado",
        description: "El bank ha sido eliminado exitosamente",
      });

      fetchBanks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al eliminar el bank",
      });
    }
  };

  const calculateROI = (bank: Bank) => {
    if (bank.initial_balance === 0) return 0;
    return ((bank.current_balance - bank.initial_balance) / bank.initial_balance) * 100;
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mis Banks</h1>
            <p className="text-muted-foreground">Gestiona tus casas de apuesta</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Bank
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Bank</DialogTitle>
                <DialogDescription>
                  Crea un nuevo bank para organizar tus apuestas
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateBank} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Nombre del Bank</Label>
                  <Input
                    id="bank-name"
                    placeholder="Ej: Bet365, Codere, etc."
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-balance">Balance Inicial</Label>
                  <Input
                    id="bank-balance"
                    type="number"
                    step="0.01"
                    placeholder="1000.00"
                    value={newBankBalance}
                    onChange={(e) => setNewBankBalance(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Crear Bank
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Banks Grid */}
        {banks.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Wallet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">No tienes Banks aún</h2>
              <p className="text-muted-foreground mb-6">
                Crea tu primer Bank para comenzar
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear mi primer Bank
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banks.map((bank) => {
              const roi = calculateROI(bank);
              const profit = bank.current_balance - bank.initial_balance;

              return (
                <Card key={bank.id} className="relative overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl">{bank.name}</CardTitle>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar bank?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará el bank y todas sus apuestas asociadas.
                              No se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteBank(bank.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Balance Actual</p>
                      <p className="text-3xl font-bold">${bank.current_balance.toFixed(2)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Balance Inicial</p>
                        <p className="text-sm font-semibold">${bank.initial_balance.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {profit >= 0 ? "Ganancia" : "Pérdida"}
                        </p>
                        <p className={`text-sm font-semibold ${profit >= 0 ? "text-success" : "text-danger"}`}>
                          ${Math.abs(profit).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">ROI</span>
                      <div className={`flex items-center gap-1 font-semibold ${roi >= 0 ? "text-success" : "text-danger"}`}>
                        {roi >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        <span>{roi.toFixed(2)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Banks;
