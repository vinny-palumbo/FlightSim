export function registerFlightTools(engine) {
  const context = document.modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const read = () => ({ running: engine.running, physicsEngine:engine.state.physicsEngine,physicsModel:engine.flight.model,physicsStatus:engine.physicsStatus,acrobatic:!!engine.state.acrobatic, scenery: engine.mode, altitudeFeet: Math.round(engine.state.y * 3.28084), airspeedKnots: Math.round(engine.state.speed * 1.94384) });
  const tools = [
    { name: 'get_flight_status', description: 'Read current flight status and instruments.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: read },
    { name: 'set_flight_paused', description: 'Pause or resume the current flight. Does not reset a crashed flight.', inputSchema: { type: 'object', properties: { paused: { type: 'boolean' } }, required: ['paused'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: input => {
      if (!input || typeof input.paused !== 'boolean' || Object.keys(input).some(key => key !== 'paused')) throw new Error('Provide only a boolean paused value.');
      if (!input.paused && (!engine.google || !engine.flight?.initialized || engine.flight.switching)) throw new Error('Choose and connect scenery before starting flight.');
      if (!input.paused && engine.state.crashed) throw new Error('Reset the crashed flight before resuming.');
      engine.running = !input.paused;engine.keys.clear();engine.emit();return read();
    } }
  ];
  for (const tool of tools) {
    try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Flight remains usable without agent tools. */ }
  }
  return () => lifecycle.abort();
}
