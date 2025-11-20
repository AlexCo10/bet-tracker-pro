import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Bank {
  id: string;
  name: string;
}

const NewBet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);

  const [bankId, setBankId] = useState("");
  const [amount, setAmount] = useState("");
  const [odds, setOdds] = useState("");
  const [status, setStatus] = useState<"open" | "won" | "lost">("open");
  const [description, setDescription] = useState("");
  const [betDate, setBetDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchBanks();
  }, []);

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
        setBankId(data[0].id);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cargar los banks",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const betAmount = parseFloat(amount);
    const betOdds = parseFloat(odds);

    if (isNaN(betAmount) || betAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El monto debe ser un número positivo",
      });
      return;
    }

    if (isNaN(betOdds) || betOdds < 1) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La cuota debe ser mayor o igual a 1",
      });
      return;
    }

    if (!bankId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar un bank",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from("bets").insert({
        user_id: session.user.id,
        bank_id: bankId,
        amount: betAmount,
        odds: betOdds,
        status: status,
        description: description,
        bet_date: betDate,
      });

      if (error) throw error;

      toast({
        title: "Apuesta registrada",
        description: "Tu apuesta ha sido registrada exitosamente",
      });

      // Reset form
      setAmount("");
      setOdds("");
      setStatus("open");
      setDescription("");
      setBetDate(new Date().toISOString().split("T")[0]);

      // Navigate to dashboard
      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al registrar la apuesta",
      });
    } finally {
      setLoading(false);
    }
  };

  if (banks.length === 0) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto">
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-2xl font-bold mb-2">No tienes Banks</h2>
              <p className="text-muted-foreground mb-6">
                Debes crear un bank antes de registrar apuestas
              </p>
              <Button onClick={() => navigate("/banks")}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Bank
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Registrar Nueva Apuesta</CardTitle>
            <CardDescription>Completa los datos de tu apuesta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bank">Bank</Label>
                <Select value={bankId} onValueChange={setBankId}>
                  <SelectTrigger id="bank">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto Apostado</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="odds">Cuota</Label>
                  <Input
                    id="odds"
                    type="number"
                    step="0.01"
                    placeholder="2.50"
                    value={odds}
                    onChange={(e) => setOdds(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Resultado</Label>
                  <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Abierta</SelectItem>
                      <SelectItem value="won">Ganada</SelectItem>
                      <SelectItem value="lost">Perdida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bet-date">Fecha</Label>
                  <Input
                    id="bet-date"
                    type="date"
                    value={betDate}
                    onChange={(e) => setBetDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Ej: Real Madrid vs Barcelona, Over 2.5 goles"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Guardando..." : "Registrar Apuesta"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/")}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default NewBet;
