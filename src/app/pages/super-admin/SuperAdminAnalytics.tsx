import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "../../components/ui/chart";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { supabase } from "../../../lib/supabase";

interface LocationPoint {
  location: string;
  jobs_count: number;
}
interface SkillPoint {
  skill: string;
  jobs_count: number;
}
interface TypePoint {
  employment_type: string;
  applications_count: number;
}
interface LeaderboardRow {
  recruiter_id: string;
  recruiter_name: string;
  company_name: string | null;
  jobs_count: number;
  hires_count: number;
}

const locationsConfig: ChartConfig = { jobs_count: { label: "Jobs", color: "var(--chart-1)" } };
const skillsConfig: ChartConfig = { jobs_count: { label: "Jobs", color: "var(--chart-2)" } };
const typeConfig: ChartConfig = { applications_count: { label: "Applications", color: "var(--chart-3)" } };

export default function SuperAdminAnalytics() {
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [skills, setSkills] = useState<SkillPoint[]>([]);
  const [types, setTypes] = useState<TypePoint[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.rpc("get_super_admin_top_locations", { p_limit: 8 }),
      supabase.rpc("get_super_admin_top_skills", { p_limit: 8 }),
      supabase.rpc("get_super_admin_applications_by_type"),
      supabase.rpc("get_super_admin_recruiter_leaderboard", { p_limit: 10 }),
    ]).then(([locRes, skillRes, typeRes, leaderRes]) => {
      if (locRes.data) setLocations(locRes.data as LocationPoint[]);
      if (skillRes.data) setSkills(skillRes.data as SkillPoint[]);
      if (typeRes.data) setTypes(typeRes.data as TypePoint[]);
      if (leaderRes.data) setLeaderboard(leaderRes.data as LeaderboardRow[]);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Cities</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={locationsConfig} className="h-[260px] w-full">
              <BarChart data={locations} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="location" type="category" tickLine={false} axisLine={false} width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="jobs_count" fill="var(--color-jobs_count)" radius={4} isAnimationActive />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Skills in Demand</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={skillsConfig} className="h-[260px] w-full">
              <BarChart data={skills} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="skill" type="category" tickLine={false} axisLine={false} width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="jobs_count" fill="var(--color-jobs_count)" radius={4} isAnimationActive />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications by Employment Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={typeConfig} className="h-[240px] w-full">
            <BarChart data={types}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="employment_type" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="applications_count" fill="var(--color-applications_count)" radius={4} isAnimationActive />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Recruiters (by hires)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recruiter</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Jobs Posted</TableHead>
                <TableHead>Hires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((row) => (
                <TableRow key={row.recruiter_id}>
                  <TableCell className="font-medium">{row.recruiter_name}</TableCell>
                  <TableCell>{row.company_name || "—"}</TableCell>
                  <TableCell>{row.jobs_count}</TableCell>
                  <TableCell>{row.hires_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
