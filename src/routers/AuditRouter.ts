import { GlobalMiddleWare } from '../middlewares/GlobalMiddleware';
import { AuditValidator } from '../validators/AuditValidator';
import { Router } from 'express';
import { AuditController } from '../controllers/AuditController';

class AuditRouter {
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
        // this.router.get('/send/reset/password/token', UserValidators.checkResetPasswordEmail(), GlobalMiddleWare.checkError, UserController.sendResetPasswordOtp);
        // this.router.get('/verify/resetPasswordToken', UserValidators.verifyResetPasswordToken(), GlobalMiddleWare.checkError, UserController.verifyResetPasswordToken);
        // this.router.get('/profile', GlobalMiddleWare.auth, UserController.profile);
        this.router.get(
            '/audit-logs/critical',
            GlobalMiddleWare.auth,
            GlobalMiddleWare.adminRole,
            AuditController.getCriticalLogs
        );
        // GET    /api/saas/audit-logs                 - Listar
        this.router.get('/export', GlobalMiddleWare.auth, GlobalMiddleWare.adminRole, AuditController.exportLogsToCSV);
        // GET    /api/saas/audit-logs/export          - Export CSV
        // FUTURO
        // GET    /api/saas/audit-logs/:logId          - Detalhes
        // POST   /api/saas/audit-logs                 - Criar
        // PUT    /api/saas/audit-logs/:logId          - Editar
        // DELETE /api/saas/audit-logs/:logId          - Deletar
        this.router.get('/', GlobalMiddleWare.auth, GlobalMiddleWare.adminRole, AuditController.getLogs);
    }

    postRoutes() {
        // this.router.post('/login', UserValidators.login(), GlobalMiddleWare.checkError, UserController.login);
        // this.router.post('/signup', UserValidators.signup(), GlobalMiddleWare.checkError, UserController.signup);
        // this.router.post('/refresh_token', GlobalMiddleWare.decodeRefreshToken, UserController.getNewTokens);
        // this.router.post('/logout', GlobalMiddleWare.auth, GlobalMiddleWare.decodeRefreshToken, UserController.logout);
    }

    patchRoutes() {
        // this.router.patch('/reset/password', UserValidators.resetPassword(), GlobalMiddleWare.checkError, UserController.resetPassword);
        // this.router.patch('/verify/emailToken', GlobalMiddleWare.auth, UserValidators.verifyUserEmailToken(), GlobalMiddleWare.checkError, UserController.verifyUserEmailToken);
        // this.router.patch('/update/phone', GlobalMiddleWare.auth, UserValidators.verifyPhoneNumber(), GlobalMiddleWare.checkError, UserController.updatePhoneNumber);
        // this.router.patch('/update/profile', GlobalMiddleWare.auth, UserValidators.verifyUserProfile(), GlobalMiddleWare.checkError, UserController.updateUserProfile);
    }

    putRoutes() {
        // this.router.put('/update/profilePic', GlobalMiddleWare.auth, new Utils().multer.single('profileImages'), UserValidators.userProfilePic(), GlobalMiddleWare.checkError, UserController.updateUserProfilePic);
        // this.router.patch(
        //     '/update/fcm-token',
        //     GlobalMiddleWare.auth,
        //     UserValidators.updateFcmToken(),
        //     GlobalMiddleWare.checkError,
        //     UserController.updateFcmToken);
    }

    deleteRoutes() {}
}

export default new AuditRouter().router;
