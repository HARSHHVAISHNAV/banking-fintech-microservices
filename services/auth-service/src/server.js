import app from './app.js'
const PORT = process.env.PORT || 4005
app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`))