import Razorpay from "razorpay";

// Initialize Razorpay with your API Keys from their dashboard
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createPaymentOrder = async (req, res) => {
    try {
        const { amount, currency } = req.body;

        const options = {
            amount: amount * 100, // Razorpay calculates amounts in smallest currency subunit (e.g., Paise for INR)
            currency: currency || "INR",
            receipt: `receipt_order_${Date.now()}`,
        };

        const order = await razorpayInstance.orders.create(options);
        
        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        console.error("Error creating payment order:", error);
        res.status(500).json({ success: false, message: "Payment initialization failed" });
    }
};

export { createPaymentOrder };