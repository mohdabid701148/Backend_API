import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        // 1️⃣ Get token from cookies OR Authorization header
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        // 2️⃣ Verify token
        const decodedToken = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        // 3️⃣ Find user from DB
        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        // 4️⃣ Validate user
        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }

        if (user.isBlocked) {
            throw new ApiError(403, "User is blocked");
        }

        // 5️⃣ Attach user to request (VERY IMPORTANT)
        req.user = user;

        // 6️⃣ Move to next middleware/controller
        next();

    } catch (error) {
        // Handle JWT errors specifically
        if (error.name === "JsonWebTokenError") {
            throw new ApiError(401, "Invalid token");
        }

        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Token expired");
        }

        throw new ApiError(
            error.statusCode || 500,
            error.message || "Authentication failed"
        );
    }
});