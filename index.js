export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", 
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 1. Je Cloud ID (bijv. 642... )
    const homeyId = env.HOMEY_ID; 
    // 2. Je API Key (die lange token)
    const apiToken = env.HOMEY_TOKEN; 

    // 🚨 HIER ZAT DE FOUT: Dit is het correcte endpoint voor de Homey Web API
    const url = `https://${homeyId}.connect.athom.com/api/manager/logic/variable`;

    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Kan Homey niet bereiken" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
}
