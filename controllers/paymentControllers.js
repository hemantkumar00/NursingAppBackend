const crypto = require("crypto");
const { instance } = require("../app");
const User = require("../models/User");
const TestSeries = require("../models/TestSeries");
const Payment = require("../models/Payment");

module.exports.Checkout = async (req, res) => {
  try {
    const options = {
      amount: Number(req.body.amount) * 100, // Corrected multiplication
      currency: "INR",
    };
    const order = await instance.orders.create(options);

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports.PaymentVarification = async (req, res) => {
  const { testSeriesId, userId } = req.params;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  generated_signature = hmac_sha256(
    razorpay_order_id + "|" + razorpay_payment_id,
    "EC5qatXC58cAUdesgcUAPhHt",
  );
  const isAuthentic = generated_signature == razorpay_signature;

  try {
    if (isAuthentic) {
      const paymentInfo = await Payment.create({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });
      const user = await User.findById(userId);
      const testSeries = await TestSeries.findById(testSeriesId);

      // Corrected the way to push data into arrays
      console.log(user);
      user.testSeriesAccess.push({
        testSeries: testSeries,
        payment: paymentInfo,
      });
      // console.log(user);
      await user.save();
      testSeries.usersEnrolled.push(user);
      await testSeries.save();

      // TODO: Multiple things like adding data to payment module, in user, and in testseries
      res.redirect(
        `${process.env.FRONTEND}/success/${testSeriesId}` ||
          `http://localhost:3000/success/${testSeriesId}`,
      );
    } else {
      res.redirect(
        `${process.env.FRONTEND}/fail/${testSeriesId}` ||
          `http://localhost:3000/fail/${testSeriesId}`,
      );
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

function hmac_sha256(data, key) {
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(data);
  return hmac.digest("hex");
}
