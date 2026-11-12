import 'package:babyhealth_guard_mobile/features/dashboard/domain/maamacare_assistant.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('loads all legacy languages and matches the English danger intent',
      () async {
    final catalog = await MaamaCareCatalog.load();

    expect(catalog.languages, hasLength(12));
    expect(
      catalog.languages['english']!.responseTo('I am bleeding'),
      contains('CRITICAL EMERGENCY'),
    );
  });

  test('uses the localized default reply when no keyword matches', () async {
    final catalog = await MaamaCareCatalog.load();

    expect(
      catalog.languages['swahili']!.responseTo('Can you help me?'),
      catalog.languages['swahili']!.defaultResponse,
    );
  });
}
