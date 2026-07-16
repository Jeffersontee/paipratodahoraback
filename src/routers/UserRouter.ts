import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { GlobalMiddleWare } from '../middlewares/GlobalMiddleware';

class UserRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.getRoutes();
        this.postRoutes();
        this.patchRoutes();
        this.putRoutes();
        this.deleteRoutes();
    }

    getRoutes() {
        // this.router.get('/send/verification/email', GlobalMiddleWare.auth, UserController.resendVerificationEmail);
        // this.router.get('/send/reset/password/token', UserController.sendResetPasswordOtp);
        // this.router.get('/verify/resetPasswordToken', UserController.verifyResetPasswordToken);
        this.router.get('/profile', GlobalMiddleWare.auth, UserController.profile);
    }

    postRoutes() {
        this.router.post('/login', UserController.login);
        this.router.post('/signup', UserController.signup);
        this.router.post('/refresh_token', GlobalMiddleWare.decodeRefreshToken, UserController.getNewTokens);
        this.router.post('/logout', GlobalMiddleWare.auth, GlobalMiddleWare.decodeRefreshToken, UserController.logout);
    }

    patchRoutes() {
        // this.router.patch('/reset/password', UserController.resetPassword);
        // this.router.patch('/verify/emailToken', GlobalMiddleWare.auth, UserController.verifyUserEmailToken);
        // this.router.patch('/update/phone', GlobalMiddleWare.auth, UserController.updatePhoneNumber);
        // this.router.patch('/update/profile', GlobalMiddleWare.auth, UserController.updateUserProfile);
    }

    putRoutes() {
        // this.router.put('/update/profilePic', GlobalMiddleWare.auth, UserController.updateUserProfilePic);
        this.router.patch(
            '/update/fcm-token',
            GlobalMiddleWare.auth,
            UserController.updateFcmToken
        );
    }

    deleteRoutes() {}
}

export default new UserRouter().router;
