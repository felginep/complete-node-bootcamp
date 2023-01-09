/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51MOLdCI3BXlYEQRqXXpJN1UGkcst3bWNf6NUpG09ULWLxk8ntOI1dIDXmR2ixUudisAcFDDUaafLfZnslwHEkrhN00zkZY684k'
);

export const bookTour = async (tourId) => {
  try {
    // Get checkout session from endpoint
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    // Create checkout form and charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    showAlert('error', err);
  }
};
