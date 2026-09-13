import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Building2, BriefcaseBusiness, Search, Users, UserRoundCheck, ArrowUpRight } from 'lucide-react';
import { userApi } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import { SelectField, TextField } from '../../components/ui/Form';

const formatTeamName = (teamLead) => {
  if (teamLead?.teamInfo?.teamName) return teamLead.teamInfo.teamName;
  return `${teamLead?.fullName || 'Team'} Team`;
};

const AdminTeamsPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: leadsResponse, isLoading: leadsLoading } = useQuery({
    queryKey: ['admin-team-leads'],
    queryFn: async () => {
      const res = await userApi.getUsers({ role: 'team_lead', limit: 200 });
      return res?.data || [];
    },
  });

  const { data: internsResponse, isLoading: internsLoading } = useQuery({
    queryKey: ['admin-team-interns'],
    queryFn: async () => {
      const res = await userApi.getUsers({ role: 'intern', limit: 500 });
      return res?.data || [];
    },
  });

  const teams = useMemo(() => {
    const leads = Array.isArray(leadsResponse) ? leadsResponse : [];
    const interns = Array.isArray(internsResponse) ? internsResponse : [];

    const teamMap = new Map();

    leads.forEach((lead) => {
      const key = lead._id || lead.id || lead.username;
      teamMap.set(key, {
        id: key,
        name: formatTeamName(lead),
        lead: lead,
        interns: [],
      });
    });

    interns.forEach((intern) => {
      const leadId = intern.teamLead?._id || intern.teamLead || null;
      const team = leadId ? teamMap.get(leadId) : null;

      if (team) {
        team.interns.push(intern);
      } else {
        const fallbackKey = `unassigned-${intern._id}`;
        teamMap.set(fallbackKey, {
          id: fallbackKey,
          name: 'Unassigned Interns',
          lead: null,
          interns: [intern],
        });
      }
    });

    const allTeams = Array.from(teamMap.values());

    const q = search.trim().toLowerCase();
    const filtered = allTeams.filter((team) => {
      const matchesSearch = !q ||
        team.name.toLowerCase().includes(q) ||
        team.lead?.fullName?.toLowerCase().includes(q) ||
        team.lead?.username?.toLowerCase().includes(q) ||
        team.interns.some((intern) =>
          intern.fullName?.toLowerCase().includes(q) ||
          intern.username?.toLowerCase().includes(q)
        );

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && team.interns.length > 0) ||
        (statusFilter === 'lead-only' && team.lead && team.interns.length === 0);

      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => b.interns.length - a.interns.length);
  }, [leadsResponse, internsResponse, search, statusFilter]);

  const totalTeams = teams.length;
  const totalLeads = Array.isArray(leadsResponse) ? leadsResponse.length : 0;
  const totalInterns = Array.isArray(internsResponse) ? internsResponse.length : 0;
  const activeTeams = teams.filter((team) => team.interns.length > 0).length;

  if (leadsLoading || internsLoading) {
    return (
      <div className="page-shell flex min-h-[420px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">Management</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Teams</h2>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{totalTeams}</span> teams
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total Teams</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{totalTeams}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Team Leads</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{totalLeads}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <UserRoundCheck className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Interns</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{totalInterns}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active Teams</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{activeTeams}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex-1 max-w-lg">
            <TextField
              label="Search team"
              placeholder="Search by team, lead, or intern"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="w-full max-w-xs">
            <SelectField
              label="Filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All teams' },
                { value: 'active', label: 'Active teams' },
                { value: 'lead-only', label: 'Lead only' },
              ]}
            />
          </div>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-12 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <BriefcaseBusiness className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-2xl font-semibold text-slate-900">No teams found</h3>
          <p className="mt-2 text-sm text-slate-500">No team records match your current search and filter settings.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">Team</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">{team.name}</h3>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    {team.interns.length} intern{team.interns.length === 1 ? '' : 's'}
                  </div>
                </div>

                {team.lead ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Team lead</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{team.lead.fullName || team.lead.username}</p>
                        <p className="text-sm text-slate-500">{team.lead.email}</p>
                      </div>
                      <div className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">
                        {team.lead.role}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm text-amber-800">No assigned team lead</p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Interns</p>
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                    View all
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {team.interns.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No interns assigned yet.
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {team.interns.map((intern) => (
                      <div key={intern._id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div>
                          <p className="font-medium text-slate-800">{intern.fullName || intern.username}</p>
                          <p className="text-xs text-slate-500">{intern.email}</p>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                          {intern.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTeamsPage;
