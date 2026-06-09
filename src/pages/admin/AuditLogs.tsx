import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLog {
  id: string;
  actor_id: string;
  action_type: string;
  table_name: string | null;
  record_id: string | null;
  old_values: any;
  new_values: any;
  metadata: any;
  created_at: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching audit logs:", error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("approve")) return "bg-success/10 text-success border-success/20";
    if (action.includes("reject")) return "bg-destructive/10 text-destructive border-destructive/20";
    if (action.includes("reassign")) return "bg-warning/10 text-warning border-warning/20";
    if (action.includes("create") || action.includes("insert")) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (action.includes("update")) return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    if (action.includes("delete")) return "bg-red-500/10 text-red-500 border-red-500/20";
    return "bg-secondary text-muted-foreground";
  };

  const filteredLogs = logs.filter((log) =>
    log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.table_name && log.table_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Audit Logs</h1>
            <p className="text-muted-foreground">Track all critical system actions</p>
          </div>
          <Button variant="outline" onClick={fetchLogs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                System Activity Log
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by action or table..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs found.</p>
                <p className="text-sm">Actions will be logged as they occur.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getActionBadgeColor(log.action_type)}>
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.table_name || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {log.record_id ? log.record_id.slice(0, 8) + "..." : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
