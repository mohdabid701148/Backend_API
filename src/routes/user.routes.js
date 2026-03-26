import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    deleteUserAccount,
    getUserProfile
} from "../controllers/user.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// AUTH ROUTES
router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverimage", maxCount: 1 }
    ]),
    registerUser
);

router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);

// PASSWORD
router.route("/change-password").post(verifyJWT, changeCurrentPassword);

// CURRENT USER
router.route("/me").get(verifyJWT, getCurrentUser);

// UPDATE PROFILE
router.route("/update-profile").patch(verifyJWT, updateAccountDetails);

// AVATAR
router.route("/avatar").patch(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
);

// COVER IMAGE
router.route("/cover-image").patch(
    verifyJWT,
    upload.single("coverimage"),
    updateUserCoverImage
);

// DELETE ACCOUNT
router.route("/delete-account").delete(verifyJWT, deleteUserAccount);

// PUBLIC PROFILE
router.route("/profile/:username").get(getUserProfile);

export default router;