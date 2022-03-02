const express = require('express');
const ejs = require('ejs');
const paypal = require('paypal-rest-sdk');
const config = require('./config.js');
const bodyParser = require('body-parser');


const client_id = config.client_id;
const secret = config.client_secret;



paypal.configure({
  'mode': 'sandbox',   //sandbox or live
  'client_id': client_id,
  'client_secret': secret
});

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

app.get('/', (req, res) => res.render('index'));


app.post('/pay', (req, res) => {
  const data = req.body;

  console.log("request.body", data);
  console.log("data.price", data.price);
  console.log("data.item", data.item);
  console.log("data.qty", data.qty);
  const myTotal = data.price * data.qty;
  console.log("my total: ", myTotal);

  const create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    "redirect_urls": {
        "return_url": "http://localhost:3000/success",
        "cancel_url": "http://localhost:3000/cancel"
    },
    "transactions": [{
        "item_list": {
            "items": [{
                "name": data.item,
                "sku": "sku",
                "price": data.price,
                "currency": "USD",
                "quantity": data.qty
            }]
        },
        "amount": {
            "currency": "USD",
            "total": myTotal
        },
        "description": data.description
    }]
};


  paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
        console.log("error: ", error);
          throw error;
      } else {
          console.log("Create Payment Response");
          console.log(payment);
          console.log("payment.transactions.amount: ", payment.transactions[0].amount.total);
          const paymentCreateAmount = payment.transactions[0].amount.total;
          for (let i = 0; i < payment.links.length; i++) {
            if(payment.links[i].rel === 'approval_url') {
              console.log("approval url: ", payment.links[i]);
              res.redirect(payment.links[i].href);


              app.get('/success/', (req, res) => {
                const payerId = req.query.PayerID;  //from success URL from PayPal
                const paymentId = req.query.paymentId; //from success URL from PAYPAL
                const myPaymentAmount = payment.transactions[0];
                console.log("here is the request body for execute payment: ", req.query);
                console.log("here is the app.get paymentCreateAmount: ", payment);
                const execute_payment_json = {
                    "payer_id": payerId,
                    "transactions": [{
                        "amount": {
                            "currency": "USD",
                            "total": myPaymentAmount.amount.total
                        }
                    }]
                };

                paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
                    if (error) {
                        console.log(error.response);
                        throw error;
                    } else {
                        console.log("Get Payment Response");
                        console.log(JSON.stringify(payment));
                        res.render('/success');
                    }
                });
              });
            }
          }
      }
  });


});  //end pay route

// route for success below

// app.get('/success/', (req, res) => {
//   // getData();
//   const payerId = req.query.PayerID;  //from success URL from PayPal
//   const paymentId = req.query.paymentId; //from success URL from PAYPAL
//   // const myPaymentAmount = payment;
//   console.log("here is the request body for execute payment: ", req.query);
//   // console.log("here is the app.get paymentCreateAmount: ", payment);
//   const execute_payment_json = {
//       "payer_id": payerId,
//       "transactions": [{
//           "amount": {
//               "currency": "USD",
//               "total": "15.00"
//           }
//       }]
//   };
//
//   paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
//       if (error) {
//           console.log(error.response);
//           throw error;
//       } else {
//           console.log("Get Payment Response");
//           console.log(JSON.stringify(payment));
//           res.send("Success");
//       }
//   });
//
// });


app.get('/cancel', (req, res) => res.send('Cancelled'));

app.listen(3000, () => console.log('Server Started, listening port 3000'));
