import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';

/// Flutterwave Payment Service for Uganda (UGX)
/// Integrates MTN Mobile Money, Airtel Money, and Cards for:
/// - Mama Kit Delivery Packs (25,000 UGX)
/// - Emergency Boda Transport Vouchers (10,000 UGX)
/// - Routine Obstetric Ultrasound Vouchers (15,000 UGX)
class FlutterwaveUgandaService {
  static const String testPublicKey = 'FLWPUBK_TEST-SANDBOXDEMO-X';
  static const String currency = 'UGX';

  /// Standard payment packages
  static const int mamaKitPrice = 25000;
  static const int bodaTransportPrice = 10000;
  static const int ultrasoundPrice = 15000;
  static const int microSavingsMinimum = 5000;

  /// Initiate a Flutterwave Payment via Webview or Hosted Link
  static Future<bool> initiateMobileMoneyPayment({
    required String phone,
    required String customerName,
    required String customerEmail,
    required int amount,
    required String packageName,
  }) async {
    final String txRef = 'BHG-FLW-${DateTime.now().millisecondsSinceEpoch}';

    if (kDebugMode) {
      print('Initiating Flutterwave Payment:');
      print('  TxRef: $txRef');
      print('  Amount: $amount $currency');
      print('  Customer: $customerName ($phone)');
      print('  Package: $packageName');
    }

    // Hosted Flutterwave Payment URL structure
    final paymentUri = Uri.parse(
      'https://checkout.flutterwave.com/v3/hosted/pay?'
      'public_key=$testPublicKey&'
      'tx_ref=$txRef&'
      'amount=$amount&'
      'currency=$currency&'
      'customer_email=${Uri.encodeComponent(customerEmail)}&'
      'customer_phone=${Uri.encodeComponent(phone)}&'
      'customer_name=${Uri.encodeComponent(customerName)}&'
      'payment_options=mobilemoneyuganda,card&'
      'customizations_title=${Uri.encodeComponent("BabyHealth Guard - $packageName")}&'
      'customizations_description=${Uri.encodeComponent("Safe Motherhood Uganda")}',
    );

    if (await canLaunchUrl(paymentUri)) {
      return await launchUrl(
        paymentUri,
        mode: LaunchMode.externalApplication,
      );
    } else {
      if (kDebugMode) {
        print('Could not launch Flutterwave hosted checkout');
      }
      return false;
    }
  }
}
