exports.handler = async (event) => {
  const token = event.path.split('/').filter(Boolean).pop();
  return { statusCode: 200, headers: { 'Content-Type': 'text/plain' }, body: token + '.3xZytWFWo1vHV91R1bGV9E5D2bYfq0aAiutpK4sXas0' };
};


