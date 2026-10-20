export default async (request, context) => {
  const url = new URL(request.url);
  const token = url.pathname.split('/').filter(Boolean).pop();
  return new Response(token + '.3xZytWFWo1vHV91R1bGV9E5D2bYfq0aAiutpK4sXas0', { status: 200, headers: { 'Content-Type': 'text/plain' } });
};

export const config = { path: '/.well-known/acme-challenge/*' };



