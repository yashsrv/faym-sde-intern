import app from './src/app.js';

const {HOST, PORT} = process.env;

app.listen(PORT, HOST, () => console.log(`API running on PORT: ${PORT}`));