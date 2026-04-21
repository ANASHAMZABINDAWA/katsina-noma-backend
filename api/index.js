export default function handler(req, res) {
  res.status(200).json({
    status: "OK",
    message: "✅ Katsina Noma API is running"
  });
}