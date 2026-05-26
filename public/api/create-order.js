const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = async function handler(req, res) {

    // Allow only POST request
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed",
        });
    }

    try {

        // DEBUG ENV VARIABLES
        console.log("KEY ID:", process.env.RAZORPAY_KEY_ID);
        console.log("KEY SECRET:", process.env.RAZORPAY_KEY_SECRET);

        const { amount } = req.body;

        // Create Razorpay Order
        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        });

        console.log("ORDER CREATED:", order);

        return res.status(200).json(order);

    } catch (error) {

        console.log("RAZORPAY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
            stack: error.stack,
        });
    }
};