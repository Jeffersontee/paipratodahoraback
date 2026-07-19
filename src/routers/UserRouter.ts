import { Router } from 'express';
import { UserValidator } from '../validators/UserValidator';
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
        this.router.get('/staff', GlobalMiddleWare.auth, UserController.listStaff);
    }

    postRoutes() {
        this.router.post('/login', UserController.login);
        this.router.post('/signup', UserController.signup);
        this.router.post('/signup-company', UserController.signupCompany);
        this.router.post('/refresh_token', GlobalMiddleWare.decodeRefreshToken, UserController.getNewTokens);
        this.router.post('/logout', GlobalMiddleWare.auth, GlobalMiddleWare.decodeRefreshToken, UserController.logout);
        this.router.post('/staff', GlobalMiddleWare.auth, UserController.createStaff);
    }

    patchRoutes() {
        this.router.patch('/staff/:id', GlobalMiddleWare.auth, UserController.updateStaff);
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

    deleteRoutes() {
        this.router.delete('/staff/:id', GlobalMiddleWare.auth, UserController.deleteStaff);
    }
}

export default new UserRouter().router;
