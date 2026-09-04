import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApp } from '../../context/AppContext';
import { formatIDR } from '../../lib/formatters';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

export const ProjectOtherCostManager: React.FC = () => {
  const { projects, projectOtherCosts } = useApp() as any;
  const [editing, setEditing] = useState<Record<string, string>>({});

  const currentFor = (projectId: string) => {
    const list = (projectOtherCosts ?? []).filter((c: any) => c.projectId === projectId).sort((a: any, b: any) => (b.effectiveDate ?? '').localeCompare(a.effectiveDate ?? ''));
    return list[0];
  };

  const handleSave = async (projectId: string) => {
    const val = editing[projectId];
    if (val === undefined) return;
    const cost = Number(val);
    if (Number.isNaN(cost) || cost < 0) { toast.error('Nilai tidak valid'); return; }
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('project_other_costs').upsert({
      project_id: projectId,
      cost_per_rit: cost,
      effective_date: today,
      notes: 'Update via MasterDataView',
    }, { onConflict: 'project_id,effective_date' });
    if (error) { toast.error(error.message); return; }
    toast.success(`Biaya operasional ${projects.find((p: any) => p.id === projectId)?.name} → ${formatIDR(cost)}/rit efektif ${today}`);
    // refresh master
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-bold">Biaya Operasional per Ritase per Proyek</CardTitle>
        <CardDescription className="text-xs">HPP other — ganti hardcode 100K/150K. Edit per proyek, histori effective_date, fallback 100K jika kosong.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-[11px]">Proyek</TableHead>
              <TableHead className="text-[11px] text-right">Biaya Saat Ini</TableHead>
              <TableHead className="text-[11px]">Edit Baru (Rp/rit)</TableHead>
              <TableHead className="text-[11px] text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((proj: any) => {
              const cur = currentFor(proj.id);
              return (
                <TableRow key={proj.id} className="text-xs">
                  <TableCell className="font-semibold">{proj.name} <span className="text-[10px] text-muted-foreground font-mono">({proj.id})</span></TableCell>
                  <TableCell className="text-right font-mono font-bold">{cur ? formatIDR(cur.costPerRit) : '100.000 (fallback)'}</TableCell>
                  <TableCell>
                    <Input type="number" placeholder="150000" value={editing[proj.id] ?? ''} onChange={(e) => setEditing((prev) => ({ ...prev, [proj.id]: e.target.value }))} className="h-7 text-xs font-mono" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleSave(proj.id)} disabled={editing[proj.id] === undefined || editing[proj.id] === ''}>Simpan</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
