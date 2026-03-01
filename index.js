export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const homeyId = env.HOMEY_ID;
    const apiToken = env.HOMEY_TOKEN;
    const base = `https://${homeyId}.connect.athom.com/api`;

    const homeyFetch = async (path) => {
      try {
        const res = await fetch(`${base}${path}`, {
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) return { _error: `HTTP ${res.status}`, _path: path };
        return await res.json();
      } catch (e) {
        return { _error: e.message, _path: path };
      }
    };

    // Fetch variables, devices, and insights list in parallel
    const [variables, devices, insights] = await Promise.all([
      homeyFetch("/manager/logic/variable"),
      homeyFetch("/manager/devices/device"),
      homeyFetch("/manager/insights/log"),
    ]);

    // Fetch entries for first 15 insight logs (to avoid too many requests)
    let insightEntries = {};
    const insightsObj = insights?.result ?? insights ?? {};
    if (!insightsObj._error) {
      const logs = Object.values(insightsObj)
        .filter(l => l && typeof l === "object" && l.uri && l.id)
        .slice(0, 15);

      const results = await Promise.all(
        logs.map(async (log) => {
          const entries = await homeyFetch(
            `/manager/insights/log/${encodeURIComponent(log.uri)}/${encodeURIComponent(log.id)}/entry?resolution=last24Hours`
          );
          return {
            key: `${log.uri}::${log.id}`,
            name: log.title || log.id,
            uri: log.uri,
            id: log.id,
            unit: log.units,
            entries,
          };
        })
      );

      results.forEach(r => { insightEntries[r.key] = r; });
    }

    const payload = {
      variables: variables?.result ?? variables,
      devices: devices?.result ?? devices,
      insights: insightsObj,
      insightEntries,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
