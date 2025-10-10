import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "../config/upstash.js";

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(500, "60 s"),
});

const rateLimiter = async (req, res, next) => {
  try {
    const ip = req.ip || "anonymous";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return res.status(429).json({
        message: "Too many requests, please try again later.",
      });
    }

    next();
  } catch (error) {
    console.error("Rate limit error:", error.message, error.stack);
    next(error);
  }
};

export default rateLimiter;