import "./index.css";

export default function SubscriptionPricingPage() {
    const plans = [
        {
            name: "Monthly",
            price: 299,
            duration: "/month",
            description: "Perfect for trying the platform.",
            features: [
                "Full Premium Access",
                "Unlimited Reports",
                "Priority Support",
                "Cloud Backup",
            ],
            popular: false,
        },
        {
            name: "Quarterly",
            price: 799,
            duration: "/3 months",
            description: "Best value for regular users.",
            features: [
                "Full Premium Access",
                "Unlimited Reports",
                "Priority Support",
                "Cloud Backup",
                "Advanced Features",
            ],
            popular: true,
        },
        {
            name: "Yearly",
            price: 2499,
            duration: "/year",
            description: "Maximum savings for professionals.",
            features: [
                "Full Premium Access",
                "Unlimited Reports",
                "Priority Support",
                "Cloud Backup",
                "Advanced Features",
                "Early Feature Access",
            ],
            popular: false,
        },
    ];

    const handlePayment = async (plan) => {
        try {
            const response = await fetch("/api/create-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount: plan.price,
                }),
            });

            const order = await response.json();

            const options = {
                key: process.env.REACT_APP_RAZORPAY_KEY_ID,

                amount: order.amount,

                currency: "INR",

                name: "Your Website Name",

                description: `${plan.name} Subscription`,

                order_id: order.id,

                handler: async function (response) {

                    const verifyResponse = await fetch(
                        "/api/verify-payment",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type": "application/json",
                            },

                            body: JSON.stringify(response),
                        }
                    );

                    const data = await verifyResponse.json();

                    if (data.success) {

                        alert("Payment Successful ✅");

                        console.log(response);

                    } else {

                        alert("Payment Verification Failed ❌");
                    }
                },

                theme: {
                    color: "#2563eb",
                },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (error) {
            console.log(error);
            alert("Payment Failed");
        }
    };

    return (
        <div className="subscription-page">
            <div className="subscription-container">
                <div className="subscription-header">
                    <h1 className="subscription-title">
                        Upgrade Your Experience
                    </h1>

                    <p className="subscription-subtitle">
                        Choose the perfect subscription plan and unlock all premium
                        features of the platform.
                    </p>
                </div>

                <div className="plans-grid">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`plan-card ${plan.popular ? "popular-plan" : ""}`}
                        >
                            {plan.popular && (
                                <div className="popular-badge">
                                    Most Popular
                                </div>
                            )}

                            <h2 className="plan-name">{plan.name}</h2>

                            <p className="plan-description">{plan.description}</p>

                            <div className="price-section">
                                <span className="plan-price">₹{plan.price}</span>
                                <span className="plan-duration">
                                    {plan.duration}
                                </span>
                            </div>

                            <div className="features-list">
                                {plan.features.map((feature) => (
                                    <div
                                        key={feature}
                                        className="feature-item"
                                    >
                                        <div className="feature-dot"></div>
                                        <span className="feature-text">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handlePayment(plan)}
                                className={`subscribe-button ${plan.popular ? "popular-button" : ""}`}
                            >
                                Subscribe Now
                            </button>
                        </div>
                    ))}
                </div>

                <div className="payment-footer">
                    Secure payments powered by Razorpay
                </div>
            </div>
        </div>
    );
}

