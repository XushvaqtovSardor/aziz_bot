import { Markup } from 'telegraf';
import { LanguageTexts } from '../../language/interfaces/language-texts.interface';
export class MainMenuKeyboard {
  static getMainMenu(texts: LanguageTexts, isPremium: boolean) {
    const keyboard = [
      [{ text: texts.searchMovie }, { text: texts.myLanguage }],
      [{ text: texts.aboutBot }],
    ];
    if (!isPremium) {
      keyboard.splice(1, 0, [{ text: texts.buyPremium }]);
    }
    return Markup.keyboard(keyboard).resize();
  }
  static getLanguageMenu(texts: LanguageTexts) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback("🇺🇿 O'zbekcha", 'lang_uz'),
        Markup.button.callback('🇷🇺 Русский', 'lang_ru'),
      ],
      [Markup.button.callback('🇬🇧 English', 'lang_en')],
    ]);
  }
  static getPremiumMenu(texts: LanguageTexts) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(texts.monthlyPremium, 'buy_premium_1'),
        Markup.button.callback(texts.threeMonthPremium, 'buy_premium_3'),
      ],
      [
        Markup.button.callback(texts.sixMonthPremium, 'buy_premium_6'),
        Markup.button.callback(texts.yearlyPremium, 'buy_premium_12'),
      ],
    ]);
  }
  static getBackButton(texts: LanguageTexts) {
    return Markup.keyboard([[{ text: texts.backButton }]]).resize();
  }
  static removeKeyboard() {
    return Markup.removeKeyboard();
  }
}
