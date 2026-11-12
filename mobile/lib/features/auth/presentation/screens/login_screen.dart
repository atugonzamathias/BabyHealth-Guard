import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../data/auth_repository.dart';
import '../../../../core/utils/validators.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.authService});

  final AuthService? authService;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  late final AuthService _authService = widget.authService ?? AuthRepository();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      await _authService.signIn(
        email: _emailController.text,
        password: _passwordController.text,
      );
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } on FirebaseAuthException catch (error) {
      setState(() => _errorMessage = _authError(error.code));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _authError(String code) {
    switch (code) {
      case 'invalid-credential':
      case 'wrong-password':
      case 'user-not-found':
        return 'The email or password is incorrect.';
      case 'network-request-failed':
        return 'Could not connect. Check your internet connection and try again.';
      case 'too-many-requests':
        return 'Too many attempts. Please wait and try again.';
      default:
        return 'Sign in failed. Please try again.';
    }
  }

  Future<void> _showForgotPasswordDialog() async {
    final resetEmailController =
        TextEditingController(text: _emailController.text.trim());
    final resetFormKey = GlobalKey<FormState>();
    var isSending = false;
    String? resetError;
    String? resetNotice;

    try {
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: const Text('Reset your password'),
            content: Form(
              key: resetFormKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Enter the email address linked to your account. We will email you a secure password reset link.',
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: resetEmailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.done,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(labelText: 'Email'),
                    validator: AppValidators.email,
                    onFieldSubmitted: (_) {
                      if (!isSending && resetNotice == null) {
                        _sendPasswordReset(
                          resetFormKey: resetFormKey,
                          emailController: resetEmailController,
                          setDialogState: setDialogState,
                          isSending: (value) => isSending = value,
                          setError: (value) => resetError = value,
                          setNotice: (value) => resetNotice = value,
                          dialogContext: dialogContext,
                        );
                      }
                    },
                  ),
                  if (resetError != null) ...[
                    const SizedBox(height: 12),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        resetError!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ),
                  ],
                  if (resetNotice != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      resetNotice!,
                      style: TextStyle(color: Colors.green.shade800),
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed:
                    isSending ? null : () => Navigator.of(dialogContext).pop(),
                child: Text(resetNotice == null ? 'Cancel' : 'Close'),
              ),
              if (resetNotice == null)
                FilledButton(
                  onPressed: isSending
                      ? null
                      : () => _sendPasswordReset(
                            resetFormKey: resetFormKey,
                            emailController: resetEmailController,
                            setDialogState: setDialogState,
                            isSending: (value) => isSending = value,
                            setError: (value) => resetError = value,
                            setNotice: (value) => resetNotice = value,
                            dialogContext: dialogContext,
                          ),
                  child: isSending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Send reset link'),
                ),
            ],
          ),
        ),
      );
    } finally {
      resetEmailController.dispose();
    }
  }

  Future<void> _sendPasswordReset({
    required GlobalKey<FormState> resetFormKey,
    required TextEditingController emailController,
    required StateSetter setDialogState,
    required void Function(bool) isSending,
    required void Function(String?) setError,
    required void Function(String?) setNotice,
    required BuildContext dialogContext,
  }) async {
    if (!(resetFormKey.currentState?.validate() ?? false)) return;
    setDialogState(() {
      isSending(true);
      setError(null);
      setNotice(null);
    });

    try {
      await _authService.sendPasswordResetEmail(
        email: emailController.text,
      );
      if (!dialogContext.mounted) return;
      setDialogState(() {
        setNotice(
          'If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.',
        );
      });
    } on FirebaseAuthException catch (error) {
      if (!dialogContext.mounted) return;
      if (error.code == 'user-not-found' || error.code == 'user-disabled') {
        setDialogState(() {
          setNotice(
            'If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.',
          );
        });
      } else {
        setDialogState(() => setError(_passwordResetError(error.code)));
      }
    } catch (_) {
      if (!dialogContext.mounted) return;
      setDialogState(
        () => setError('Could not send the reset email. Please try again.'),
      );
    } finally {
      if (dialogContext.mounted) {
        setDialogState(() => isSending(false));
      }
    }
  }

  String _passwordResetError(String code) {
    switch (code) {
      case 'invalid-email':
        return 'Enter a valid email address.';
      case 'network-request-failed':
        return 'Could not connect. Check your internet connection and try again.';
      case 'too-many-requests':
        return 'Too many requests. Please wait a while before trying again.';
      case 'operation-not-allowed':
        return 'Password reset is not enabled for this app. Contact support.';
      case 'invalid-continue-uri':
      case 'unauthorized-continue-uri':
      case 'missing-continue-uri':
        return 'Password reset email is not configured correctly. Contact support.';
      default:
        return 'Could not send the reset email. Please try again.';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Welcome back',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Sign in to view your care profile and health records.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(labelText: 'Email'),
                    validator: AppValidators.email,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    autofillHints: const [AutofillHints.password],
                    decoration: const InputDecoration(labelText: 'Password'),
                    validator: (value) => value == null || value.isEmpty
                        ? 'Password is required'
                        : null,
                    onFieldSubmitted: (_) => _signIn(),
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: _isLoading ? null : _showForgotPasswordDialog,
                      child: const Text('Forgot password?'),
                    ),
                  ),
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _errorMessage!,
                      style:
                          TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _isLoading ? null : _signIn,
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Sign in'),
                  ),
                  TextButton(
                    onPressed: () =>
                        Navigator.of(context).pushNamed('/register'),
                    child: const Text('Create a mother account'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
