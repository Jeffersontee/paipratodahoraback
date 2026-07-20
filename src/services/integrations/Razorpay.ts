// //import * as Rzpay from 'razorpay';
// import { getEnvironmentVariables } from '../environments/environment';

// const instance = new Rzpay({
//     key_id: getEnvironmentVariables().razorpay.key_id,
//     key_secret: getEnvironmentVariables().razorpay.key_secret,
// });

// export class Razorpay {

//     static createOrder(data: {amount: number, currency: string, receipt?: string}): Promise<any> {
//         const options = {
//             amount: data.amount,  // amount in the smallest currency unit
//             currency: data.currency,
//             // receipt: "order_rcptid_11"
//         };
//         return new Promise((resolve, reject) => {
//             instance.orders.create(options, (err, order) => {
//                 // console.log(order);
//                 if(err) reject(err);
//                 else resolve(order);
//             });

//         });
//     }

// }