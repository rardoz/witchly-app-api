import 'dotenv/config';
import app from './app';

const PORT: number = Number(process.env.PORT) || 3000;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
