import { Activity, Server, Users, Cpu, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function PlatformMonitoring() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Platform Monitoring</h1>
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-medium">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          System Operational
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-green-600">+12%</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">API Requests (24h)</p>
          <p className="text-2xl font-bold text-gray-900">1.2M</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-green-600">+5%</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">Concurrent Users</p>
          <p className="text-2xl font-bold text-gray-900">842</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-400">Stable</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">Server Load</p>
          <p className="text-2xl font-bold text-gray-900">42%</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-red-600">-2%</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">Error Rate</p>
          <p className="text-2xl font-bold text-gray-900">0.04%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent System Logs</h2>
          <div className="space-y-4">
            {[
              { type: 'info', msg: 'Database backup completed successfully', time: '10 mins ago' },
              { type: 'warning', msg: 'High latency detected on Redis cluster', time: '1 hour ago' },
              { type: 'info', msg: 'New deployment v2.1.4 live', time: '3 hours ago' },
              { type: 'error', msg: 'Failed webhook delivery to Stripe', time: '5 hours ago' },
            ].map((log, i) => (
              <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                <div className="mt-0.5">
                  {log.type === 'info' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                  {log.type === 'warning' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                  {log.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{log.msg}</p>
                  <p className="text-xs text-gray-400 mt-1">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Services Health</h2>
          <div className="space-y-4">
            {[
              { name: 'Supabase Database', status: 'Operational', ping: '12ms' },
              { name: 'Authentication API', status: 'Operational', ping: '24ms' },
              { name: 'Storage Buckets', status: 'Operational', ping: '45ms' },
              { name: 'Edge Functions', status: 'Operational', ping: '18ms' },
            ].map((service, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-sm text-gray-900">{service.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">{service.ping}</span>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
