using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI;
using Windows.UI.Text;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

namespace Vraki_Language
{
    public sealed partial class MainPage : Page
    {
        // All CharList. Arrays and stuff of the sorts.
        #region Class Wide Variables

        private int reverseType;
        private bool toVraki = true; // Due to Default config set to >>> on Switch Direction Button
        List<Char> alphabet = new List<Char>(new Char[] { 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q',
            'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z' });
        List<Char> consonants = new List<Char>(new Char[] { 'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v',
            'w', 'x', 'y', 'z' });
        List<Char> vowels = new List<Char>(new Char[] { 'a', 'e', 'i', 'o', 'u' });
        List<String> vrakiToTranslate = new List<String>(new String[] { "hf", "la", "tu", "fs", "uf", "yn", "eb", "im", "id", "uk", "ud", "ne", "od",
            "sv", "au", "fn", "da", "rs", "kh", "oi", "ie", "rt" });
        List<String> vrakiTranslated = new List<String>(new String[] { "c-rn`ld", "s-or`ld", "u-dx`ld", "a-ew`ld", "s-eh`ld", "t-is`ld", "h-tk`ld",
            "n-aj`ld", "e-ra`ld", "s-dc`ld", "o-ek`ld", "a-it`ld", "s-er`ld", "s-lc`ld", "c-kj`ld", "a-ts`ld", "e-om`ld", "l-li`ld", "e-mi`ld",
            "i-rg`ld", "r-mi`ld", "t-nx`ld" });
        char[] wordBreaks = { ' ', '.', '/', '*', '-', ',', '!', '?', '|' }; // used by some reverse Algorithms
        char[] toUpperCaseTriggers = { '.', ',', '!', '?' }; // used by Letter Case Algorithms.

        #endregion Class Wide Variables

        // Also handling setup of algorthm vars on Interface Control. See updateSettings("Default");
        #region MainPage Object Instatiation
        public MainPage()
        {
            this.InitializeComponent();
            changeCurrentFlipViewPanelInfo();
            updateSettings("Default");
            configPanel.IsPaneOpen = true;
            vrakiTextBox.IsReadOnly = true; // Part of Initial Setup of toVraki
        }
        #endregion MainPage Object Instatiation

        // Event Handlers
        #region Event Handlers

        private void switchLetterCase_Toggled(object sender, RoutedEventArgs e)
        {
            detectCustomSettings();
        }
        private void switchReverse_Toggled(object sender, RoutedEventArgs e)
        {
            updateReverse("switch");
            detectCustomSettings();
        }

        private void reverseTypeButton_Click(object sender, RoutedEventArgs e)
        {
            MenuFlyoutItem item = new MenuFlyoutItem();
            // Prevent App crash in case sender is not MenuFlyoutItem
            try
            {
                item = (MenuFlyoutItem)sender;
            }
            catch
            {
                item.Text = "";
            }
            updateReverse(item.Text.ToString());
            detectCustomSettings();
        }

        private void switchShift_Toggled(object sender, RoutedEventArgs e)
        {
            updateShift();
            detectCustomSettings();
        }

        private void sharedShiftSlider_ValueChanged(object sender, RangeBaseValueChangedEventArgs e)
        {
            detectCustomSettings();
        }

        private void vowelShiftSlider_ValueChanged(object sender, RangeBaseValueChangedEventArgs e)
        {
            detectCustomSettings();
        }

        private void switchVrakiStructure_Toggled(object sender, RoutedEventArgs e)
        {
            detectCustomSettings();
        }
        
        private void textboxesMaster_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            changeCurrentFlipViewPanelInfo();
        }

        private void conversionTypeButton_Click(object sender, RoutedEventArgs e)
        {
            MenuFlyoutItem item = new MenuFlyoutItem();
            // Prevent App crash in case sender is not MenuFlyoutItem
            try
            {
                item = (MenuFlyoutItem)sender;
            }
            catch {
                item.Text = "";
            }
            updateSettings(item.Text.ToString());
        }
        
        private void switchDirectionButton_Click(object sender, RoutedEventArgs e)
        {
            changeTranslationDirection();
        }

        private void orgTextBlock_Tapped(object sender, TappedRoutedEventArgs e)
        {
            changeCurrentPanel(1);
        }
        private void vrakiTextBlock_Tapped(object sender, TappedRoutedEventArgs e)
        {
            changeCurrentPanel(2);
        }
        private void switchConfigPanelButton_Click(object sender, RoutedEventArgs e)
        {
            configPanel.IsPaneOpen = true;
        }
        
        // Translation Control.
        private void translateButton_Tapped(object sender, TappedRoutedEventArgs e)
        {
            translateProgress.Visibility = Visibility.Visible;
            translateButton.Visibility = Visibility.Collapsed;
            // Find Direction Config
            String toTranslate;
            if (toVraki)
            {
                toTranslate = nonVrakiTextBox.Text;
                toVrakiTranslation(ref toTranslate);
                vrakiTextBox.Text = toTranslate;
            }
            else
            {
                toTranslate = vrakiTextBox.Text;
                fromVrakiTranslation(ref toTranslate);
                nonVrakiTextBox.Text = toTranslate;
            }
            translateProgress.Visibility = Visibility.Collapsed;
            translateButton.Visibility = Visibility.Visible;
        }

        #endregion Event Handlers

        // Interface Control
        #region Interface Control


        // Sync most of settings to the conversion type.
        /* CONVERSION TYPES
         * 1. Default
         * 2. Simple Vraki
         * 3. Complex Vraki
         * 4. Minimal
         * 5. Custom
        */
        private void updateSettings(String updateType)
        {
            switch (updateType)
            {
                case "Default":
                    currentTypeText.Text = "Default";
                    switchReverse.IsOn = true;
                    updateReverse("Char Reverse");
                    switchShift.IsOn = true;
                    switchVowelSeparately.IsOn = false;
                    vowelShiftSlider.Value = 0;
                    sharedShiftSlider.Value = -3;
                    updateShift();
                    switchVrakiStructure.IsOn = false;
                    switchLetterCase.IsOn = true;
                    break;
                case "Simple Vraki":
                    currentTypeText.Text = "Simple Vraki";
                    switchReverse.IsOn = false;
                    updateReverse("switch");
                    switchShift.IsOn = false;
                    switchVowelSeparately.IsOn = false;
                    vowelShiftSlider.Value = 0;
                    sharedShiftSlider.Value = 0;
                    updateShift();
                    switchVrakiStructure.IsOn = true;
                    switchLetterCase.IsOn = true;
                    break;
                case "Complex Vraki":
                    currentTypeText.Text = "Complex Vraki";
                    switchReverse.IsOn = true;
                    updateReverse("Char + Word Pair Reverse");
                    switchShift.IsOn = true;
                    switchVowelSeparately.IsOn = true;
                    vowelShiftSlider.Value = 2;
                    sharedShiftSlider.Value = -10;
                    updateShift();
                    switchVrakiStructure.IsOn = true;
                    switchLetterCase.IsOn = true;
                    break;
                case "Minimal":
                    currentTypeText.Text = "Minimal";
                    switchReverse.IsOn = false;
                    updateReverse("switch");
                    switchShift.IsOn = true;
                    switchVowelSeparately.IsOn = false;
                    vowelShiftSlider.Value = 0;
                    sharedShiftSlider.Value = 1;
                    updateShift();
                    switchVrakiStructure.IsOn = false;
                    switchLetterCase.IsOn = true;
                    break;
                case "Custom":

                    break;
                default:
                    // Do Nothing
                    break;
            }
        }

        private void detectCustomSettings()
        {
            if (switchReverse.IsOn == true && switchShift.IsOn == true && switchVowelSeparately.IsOn == false &&
            vowelShiftSlider.Value == 0 && sharedShiftSlider.Value == -3 && reverseType == 1 && switchVrakiStructure.IsOn == false && switchLetterCase.IsOn == true)
            {
                currentTypeText.Text = "Default";
            }
            else if (switchReverse.IsOn == false && switchShift.IsOn == false && switchVowelSeparately.IsOn == false &&
            vowelShiftSlider.Value == 0 && sharedShiftSlider.Value == 0 && switchVrakiStructure.IsOn == true && switchLetterCase.IsOn == true)
            {
                currentTypeText.Text = "Simple Vraki";
            }
            else if (switchReverse.IsOn == true && switchShift.IsOn == true && switchVowelSeparately.IsOn == true &&
            vowelShiftSlider.Value == 2 && sharedShiftSlider.Value == -10 && reverseType == 5 && switchVrakiStructure.IsOn == true && switchLetterCase.IsOn == true)
            {
                currentTypeText.Text = "Complex Vraki";
            }
            else if (switchReverse.IsOn == false && switchShift.IsOn == true && switchVowelSeparately.IsOn == false &&
            vowelShiftSlider.Value == 0 && sharedShiftSlider.Value == 1 && switchVrakiStructure.IsOn == false && switchLetterCase.IsOn == true)
            {
                currentTypeText.Text = "Minimal";
            }
            else
            {
                currentTypeText.Text = "Custom";
            }
        }

        // Responsible for Reverse Configs
        /* REVERSE TYPES
         * 1. Char Reverse
         * 2. Word Reverse
         * 3. Word Pair Reverse
         * 4. Char + Word Reverse
         * 5. Char + Word Pair Reverse
        */
        private void updateReverse(String updateType = "switch")
        {
            switch (updateType)
            {
                case "switch":
                    if (switchReverse.IsOn)
                    {
                        currentReverseTypeText.Visibility = Visibility.Visible;
                        reverseTypeButton.Visibility = Visibility.Visible;
                        currentReverseTypeCurrentText.Visibility = Visibility.Visible;
                    }
                    else
                    {
                        currentReverseTypeText.Visibility = Visibility.Collapsed;
                        reverseTypeButton.Visibility = Visibility.Collapsed;
                        currentReverseTypeCurrentText.Visibility = Visibility.Collapsed;
                    }

                    break;
                case "Char Reverse":
                    currentReverseTypeText.Text = "Char";
                    reverseType = 1;
                    break;
                case "Word Reverse":
                    currentReverseTypeText.Text = "Word";
                    reverseType = 2;
                    break;
                case "Word Pair Reverse":
                    currentReverseTypeText.Text = "Word Pair";
                    reverseType = 3;
                    break;
                case "Char + Word Reverse":
                    currentReverseTypeText.Text = "Chair + W.";
                    reverseType = 4;
                    break;
                case "Char + Word Pair Reverse":
                    currentReverseTypeText.Text = "Char + W. Pair";
                    reverseType = 5;
                    break;
                default:
                    // Do Nothing
                    break;
            }
        }

        // Responsible for Character Shift Configs
        private void updateShift()
        {
            if (switchShift.IsOn)
            {
                differentialShiftText.Visibility = Visibility.Visible;
                switchVowelSeparately.Visibility = Visibility.Visible;
                characterShiftSharedTitle.Visibility = Visibility.Visible;
                sharedShiftSlider.Visibility = Visibility.Visible;
                if (switchVowelSeparately.IsOn)
                {
                    characterShiftSharedTitle.Text = "Shift Consonants by";
                    if (sharedShiftSlider.Value < -20 || sharedShiftSlider.Value > 20)
                    {
                        sharedShiftSlider.Value = 0;
                    }
                    sharedShiftSlider.Maximum = 20;
                    sharedShiftSlider.Minimum = -20;
                    vowelsText.Visibility = Visibility.Visible;
                    vowelShiftSlider.Visibility = Visibility.Visible;
                    vowelsText.Visibility = Visibility.Visible;
                }
                else
                {
                    characterShiftSharedTitle.Text = "Shift by";
                    sharedShiftSlider.Maximum = 25;
                    sharedShiftSlider.Minimum = -25;
                    vowelsText.Visibility = Visibility.Collapsed;
                    vowelShiftSlider.Visibility = Visibility.Collapsed;
                    vowelsText.Visibility = Visibility.Collapsed;
                }
            }
            else
            {
                differentialShiftText.Visibility = Visibility.Collapsed;
                switchVowelSeparately.Visibility = Visibility.Collapsed;
                characterShiftSharedTitle.Visibility = Visibility.Collapsed;
                sharedShiftSlider.Visibility = Visibility.Collapsed;
                vowelsText.Visibility = Visibility.Collapsed;
                vowelShiftSlider.Visibility = Visibility.Collapsed;
                vowelsText.Visibility = Visibility.Collapsed;

            }
        }

        // Change current panel being show
        private void changeCurrentPanel(int panel)
        {
            switch (panel)
            {
                case 1:
                    textboxesMaster.SelectedIndex = 0;
                    break;
                case 2:
                    textboxesMaster.SelectedIndex = 1;
                    break;
                default:
                    // Do Nothing
                    break;
            }
        }

        // Change info about current panel being show based on current FlipView Selected Item
        private void changeCurrentFlipViewPanelInfo()
        {
            FlipViewItem sp = (FlipViewItem)textboxesMaster.SelectedItem;
            if (sp.Name == "panel1")
                currentPanel.Text = "Text Panel";
            else
                currentPanel.Text = "Vraki Panel";
        }

        // Flip Translaction direction alongside blocking the output text.
        private void changeTranslationDirection()
        {
            if (switchDirectionButton.Content.ToString() == ">>>")
            {
                toVraki = false;
                switchDirectionButton.Content = "<<<";
                vrakiTextBox.IsReadOnly = false;
                nonVrakiTextBox.IsReadOnly = true;
                nonVrakiTextBox.Text = "";
                orgTextBlock.Foreground = new SolidColorBrush(Colors.Black);
                vrakiTextBlock.Foreground = new SolidColorBrush(Colors.Red);
            }
            else
            {
                toVraki = true;
                switchDirectionButton.Content = ">>>";
                vrakiTextBox.IsReadOnly = true;
                nonVrakiTextBox.IsReadOnly = false;
                vrakiTextBox.Text = "";
                orgTextBlock.Foreground = new SolidColorBrush(Colors.Red);
                vrakiTextBlock.Foreground = new SolidColorBrush(Colors.Black);
            }
        }
        #endregion  Interface Control

        // Translation Flow Control
        #region Translation Flow Control

        // 1st > Reverse | 2nd > Shift | 3rd > VrakiStructure
        private void toVrakiTranslation(ref String toTranslate)
        {
            toTranslate = toTranslate.ToLower();
            if (toTranslate.Length > 0)
            {
                // Resolve Reverse Config
                if (switchReverse.IsOn)
                {
                    switch (reverseType)
                    {
                        case 1:
                            toTranslate = charReverse(toTranslate);
                            break;
                        case 2:
                            toTranslate = wordReverse(toTranslate);
                            break;
                        case 3:
                            toTranslate = wordPairReverse(toTranslate, true);
                            break;
                        case 4:
                            toTranslate = charWordReverse(toTranslate, true);
                            break;
                        case 5:
                            toTranslate = charWordParReverse(toTranslate, true);
                            break;
                        default:
                            break;
                    }
                }

                // Resolve Shift Config
                if (switchShift.IsOn)
                {
                    if (switchVowelSeparately.IsOn)
                    {
                        toTranslate = shiftSeparately(toTranslate, true);
                    }
                    else
                    {
                        toTranslate = shiftAll(toTranslate, true);
                    }
                }

                // Resolve VrakiStructure
                if (switchVrakiStructure.IsOn)
                {
                    toTranslate = resolveVrakiStructure(toTranslate, true);
                }

                // Resolve Letter Case
                if (switchLetterCase.IsOn)
                {
                    toTranslate = resolveLetterCase(toTranslate);
                }
            }
        }

        // 1st > VrakiStructure | 2nd > Shift | 3rd > Reverse
        private void fromVrakiTranslation(ref String toTranslate)
        {
            toTranslate = toTranslate.ToLower();

            // Resolve VrakiStructure
            if (switchVrakiStructure.IsOn)
            {
                toTranslate = resolveVrakiStructure(toTranslate, false);
            }
            
            // Resolve Shift Config
            if (switchShift.IsOn)
            {
                if (switchVowelSeparately.IsOn)
                {
                    toTranslate = shiftSeparately(toTranslate, false);
                }
                else
                {
                    toTranslate = shiftAll(toTranslate, false);
                }
            }

            // Resolve Reverse Config
            if (switchReverse.IsOn)
            {
                switch (reverseType)
                {
                    case 1:
                        toTranslate = charReverse(toTranslate);
                        break;
                    case 2:
                        toTranslate = wordReverse(toTranslate);
                        break;
                    case 3:
                        toTranslate = wordPairReverse(toTranslate, false);
                        break;
                    case 4:
                        toTranslate = charWordReverse(toTranslate, false);
                        break;
                    case 5:
                        toTranslate = charWordParReverse(toTranslate, false);
                        break;
                    default:
                        break;
                }
            }

            // Resolve Letter Case
            if (switchLetterCase.IsOn) {
                toTranslate = resolveLetterCase(toTranslate);
            }
        }

        #endregion  Translation Flow Control

        // Algorithms
        // Reverse Types: Char, Word, Word Par, Char + Word and Char + Word Par.
        #region Reverse Algorithms

        // Normal Reverse is the common place Reverse of an entire text with no additional rules.
        private String charReverse(String toReverse)
        {
            List<Char> reversedList = new List<Char>();
            String reversed = "";
            int reverseSize = toReverse.Length - 1;

            // Loop from end to beg of toReverse while adding the current position char to reversedList
            for (int i = 0; i <= reverseSize; i++)
            {
                reversedList.Add(toReverse.ElementAt(reverseSize - i));
            }
            reversed = buildOutput(reversedList);
            return reversed;
        }

        // Reverse each word instead of whole text so that word position is preserved.
        private String wordReverse(String toReverse)
        {
            List<Char> reversedList = new List<Char>();
            List<Char> tempWordList = new List<Char>();
            String reversed = "";
            int reverseSize = toReverse.Length - 1;

            bool withinWord = false;

            for (int i = 0; i <= reverseSize; i++)
            {
                // If there are wordBreaks or it is the end of text
                // Then reverse temp stored word (if there is one) 
                // else just add chars to word temp storage.
                if (wordBreaks.Contains(toReverse.ElementAt(i)) || i == reverseSize)
                {
                    // if no word is currently temp stored, then just add wordBreak to reversedList and move on.
                    if (!withinWord)
                    {
                        reversedList.Add(toReverse.ElementAt(i));
                    }
                    else
                    {
                        int tempReverseSize = tempWordList.Count - 1;
                        // Reverse temp stored word
                        for (int x = 0; x <= tempReverseSize; x++)
                        {
                            reversedList.Add(tempWordList.ElementAt(tempReverseSize - x));
                        }
                        withinWord = false;
                        tempWordList.Clear();
                        reversedList.Add(toReverse.ElementAt(i));
                    }
                }
                else {
                    withinWord = true;
                    tempWordList.Add(toReverse.ElementAt(i));
                }
            }
            reversed = buildOutput(reversedList);
            return reversed;
        }

        // Similar to Word Reverse, but actual reversal process differs.
        private String wordPairReverse(String toReverse, bool toVraki)
        {
            List<Char> reversedList = new List<Char>();
            List<Char> tempWordList = new List<Char>();
            String reversed = "";
            int reverseSize = toReverse.Length - 1;
            int medianCharPosition = 0;
            int amountOfPairs = 0;
            int tempReverseSize = 0;
            bool withinWord = false;
            bool oddTempWord = false;
            Char medianChar = ' ';

            for (int i = 0; i <= reverseSize; i++)
            {
                // If there are wordBreaks or it is the end of text
                // Then pair reverse temp stored word (if there is one) 
                // else just add chars to word temp storage.
                if (wordBreaks.Contains(toReverse.ElementAt(i)) || i == reverseSize)
                {
                    // Special Rule for toReverse end of text loop issue.
                    if (i == reverseSize)
                        tempWordList.Add(toReverse.ElementAt(i));
                    // if no word is currently temp stored, then just add wordBreak to reversedList and move on.
                    if (!withinWord || tempWordList.Count == 1)
                    {
                        reversedList.Add(toReverse.ElementAt(i));
                    }
                    else
                    {
                        // Pair Reverse temp stored word
                        // Setup List and approprate vars for conversion
                        oddTempWord = isOdd(tempWordList.Count);
                        amountOfPairs = tempWordList.Count / 2;
                        tempReverseSize = tempWordList.Count - 1;
                        if (oddTempWord && toVraki)
                        {
                            // Conversion toVraki requires remove of median value that makes word odd numbered.
                            medianCharPosition = findOddMedian(tempReverseSize);
                            medianChar = tempWordList.ElementAt(medianCharPosition);
                            tempWordList.RemoveAt(medianCharPosition);
                            tempReverseSize -= 1;
                        }
                        else if (oddTempWord && !toVraki)
                        {
                            // fromVraki requires last Char to be stored aside and inserted back in the middle during conversion
                            medianCharPosition = findOddMedian(tempReverseSize);
                            medianChar = tempWordList.ElementAt(tempReverseSize);
                            tempWordList.RemoveAt(tempReverseSize);
                            tempReverseSize -= 1;
                        }

                        // Encryption/Decryption are different
                        if (toVraki)
                        {
                            //toVraki Conversion
                            //If Word is even > Get Size and pick it apart from the outside in, taking a pair from each end starting from right end.
                            //If word is odd > Get Size and take median char out. Do the same as even then add char at end.

                            for (int x = 0; x < amountOfPairs; x++)
                            {
                                reversedList.Add(tempWordList.ElementAt(tempReverseSize - x));
                                reversedList.Add(tempWordList.ElementAt(x));
                            }
                        }
                        else
                        {
                            // fromVraki Conversion
                            //If Word is even, then pull all odd from left to right followed by all even from right to left.
                            //If word is odd, then get Size and take mean char out. Do the same as even then add char at end.

                            // First Half Conversion by taking every 2nd char from left to right.
                            for (int x = 1; x <= tempReverseSize; x += 2)
                            {
                                reversedList.Add(tempWordList.ElementAt(x));
                            }
                            // Insert Middle Char if Odd
                            if(oddTempWord)
                                reversedList.Add(medianChar);
                            tempReverseSize -= 1;
                            for (int x = tempReverseSize; x >= 0; x -= 2)
                            {
                                reversedList.Add(tempWordList.ElementAt(x));
                            }
                        }

                        // Special Rules for word ends
                        // 1. Add medianChar back to odd words after toVraki conversion.
                        // 2. Add wordBreak back if there is one. 
                        // Tis important to check to prevent adding word chars for cases such as end of text.
                        if (oddTempWord && toVraki)
                        {
                            reversedList.Add(medianChar);
                        }
                        if (wordBreaks.Contains(toReverse.ElementAt(i)))
                        {
                            reversedList.Add(toReverse.ElementAt(i));
                        }
                        withinWord = false;
                        oddTempWord = false;
                        tempWordList.Clear();
                    }
                }
                else
                {
                    withinWord = true;
                    tempWordList.Add(toReverse.ElementAt(i));
                }
            }
            reversed = buildOutput(reversedList);
            return reversed;
        }
        
        // Perform Char Reversal followed by Word Reverse. Do the Opposite when converting back.
        private String charWordReverse(String toReverse, bool toVraki)
        {
            String reversed = "";
            if (toVraki)
            {
                reversed = charReverse(toReverse);
                reversed = wordReverse(reversed);
            }
            else
            {
                reversed = wordReverse(toReverse);
                reversed = charReverse(reversed);
            }
            return reversed;
        }

        // Perform Normal Reversal followed by Word Par Reverse. Do the Opposite when converting back.
        private String charWordParReverse(String toReverse, bool toVraki)
        {
            String reversed = "";
            if (toVraki)
            {
                reversed = charReverse(toReverse);
                reversed = wordPairReverse(reversed,true);
            }
            else
            {
                reversed = wordPairReverse(toReverse, false);
                reversed = charReverse(reversed);
            }
            return reversed;
        }


        #endregion Reverse Algorithms

        // Shift Types: All or Different rates for consonants and vowels.
        #region Shift Algorithms

        // Shift All chars by a x input.
        private String shiftAll(String toShift, bool toVraki)
        {
            int shiftBy = Convert.ToInt16(sharedShiftSlider.Value);
            if (!toVraki)
                shiftBy *= -1;

            List<Char> shiftedList = new List<Char>();
            String shifted = "";
            int shiftSize = toShift.Length - 1;
            
            for (int i = 0; i <= shiftSize; i++)
            {
                Char currentChar = toShift.ElementAt(i);
                int charAlphabetPosition = alphabet.IndexOf(currentChar);
                if (charAlphabetPosition < 0)
                {
                    shiftedList.Add(currentChar);
                }
                else
                {
                    int newCharAlphabetPosition = charAlphabetPosition + shiftBy;
                    if (newCharAlphabetPosition > 25)
                        newCharAlphabetPosition -= 26;
                    if (newCharAlphabetPosition < 0)
                        newCharAlphabetPosition += 26;
                    shiftedList.Add(alphabet.ElementAt(newCharAlphabetPosition));
                }
            }
            shifted = buildOutput(shiftedList);
            return shifted;
        }

        // Shift consonant and vowels chars by different input rates.
        private String shiftSeparately(String toShift, bool toVraki)
        {
            int shiftCBy = Convert.ToInt16(sharedShiftSlider.Value);
            int shiftVBy = Convert.ToInt16(vowelShiftSlider.Value);
            if (!toVraki)
            {
                shiftCBy *= -1;
                shiftVBy *= -1;
            }

            List<Char> shiftedList = new List<Char>();
            String shifted = "";
            int shiftSize = toShift.Length - 1;

            for (int i = 0; i <= shiftSize; i++)
            {
                Char currentChar = toShift.ElementAt(i);
                int consonantAlphabetPosition = consonants.IndexOf(currentChar);
                int vowelAlphabetPosition = vowels.IndexOf(currentChar);
                if (consonantAlphabetPosition >= 0)
                {
                    int newCharAlphabetPosition = consonantAlphabetPosition + shiftCBy;
                    if (newCharAlphabetPosition > 20)
                        newCharAlphabetPosition -= 21;
                    if (newCharAlphabetPosition < 0)
                        newCharAlphabetPosition += 21;
                    shiftedList.Add(consonants.ElementAt(newCharAlphabetPosition));
                }
                else if (vowelAlphabetPosition >= 0)
                {
                    int newCharAlphabetPosition = vowelAlphabetPosition + shiftVBy;
                    if (newCharAlphabetPosition > 4)
                        newCharAlphabetPosition -= 5;
                    if (newCharAlphabetPosition < 0)
                        newCharAlphabetPosition += 5;
                    shiftedList.Add(vowels.ElementAt(newCharAlphabetPosition));
                }
                else
                {
                    shiftedList.Add(currentChar);
                }
            }
            shifted = buildOutput(shiftedList);
            return shifted;
        }

        #endregion Shift Algorithms

        // Vraki Structure is summarized in changing specific set or words into others.
        // See vraki translation Lists on 1st region.
        #region Vraki Structure Algorithms

        private string resolveVrakiStructure(string toTranslate, bool toVraki)
        {
            List<Char> translatedList = new List<Char>();
            String translated = "";
            int translateSize = toTranslate.Length - 1;
            List<String> possibleMatches = new List<String>();

            // toVraki and fromVraki are different enough to fully split their for loop oprations.
            if (toVraki)
            {
                for (int i = 0; i <= translateSize; i++)
                {
                    // If last char, then just add it to list and call it quits.
                    if (i == translateSize)
                    {
                        translatedList.Add(toTranslate.ElementAt(i));
                        break;
                    }
                    // Get i and i +1 char and checks it against vrakiToTranslate 
                    Char currentChar = toTranslate.ElementAt(i);
                    Char nextChar = toTranslate.ElementAt((i + 1));
                    String possibleMatch = currentChar.ToString() + nextChar.ToString();
                    possibleMatches = vrakiToTranslate.Where(match => match.StartsWith(possibleMatch)).ToList();
                    // If match is found, then add it to translatedList.
                    if (possibleMatches.Count == 1)
                    {
                            int indexOfMatch = vrakiToTranslate.IndexOf(possibleMatches.ElementAt(0));
                            String translatedToVraki = vrakiTranslated.ElementAt(indexOfMatch);
                            // Dump each char from translatedToVraki String into translatedList.
                            foreach (char c in translatedToVraki)
                            {
                                translatedList.Add(c);
                            }
                            // Advance an extra char since all toVraki translations are 2 chars.
                            i++;
                    }
                    else
                    {
                        translatedList.Add(toTranslate.ElementAt(i));
                    }
                    possibleMatches.Clear();
                }
            }
            else
            {
                for (int i = 0; i <= translateSize; i++)
                {
                    // If last few chars, then just add them and call it quits.
                    if (i > (translateSize - 6))
                    {
                        for (int x = i; x <= translateSize; x++)
                        {
                            translatedList.Add(toTranslate.ElementAt(x));
                        }
                        break;
                    }
                    // Get i and next 3 chars and checks it against vrakiToTranslate
                    // Vraki Structure is x-xx`ld
                    String currentChar = toTranslate.ElementAt(i).ToString() + toTranslate.ElementAt((i + 1)).ToString();
                    String nextPair = toTranslate.ElementAt((i + 2)).ToString() + toTranslate.ElementAt((i + 3)).ToString();
                    String lastPair = toTranslate.ElementAt((i + 4)).ToString() + toTranslate.ElementAt((i + 5)).ToString();
                    String possibleMatch = currentChar + nextPair + lastPair + toTranslate.ElementAt((i + 6)).ToString();
                    possibleMatches = vrakiTranslated.Where(match => match.StartsWith(possibleMatch)).ToList();
                    // If match is found, then add it to translatedList.
                    if (possibleMatches.Count == 1)
                    {
                        int indexOfMatch = vrakiTranslated.IndexOf(possibleMatches.ElementAt(0));
                        String translatedFromVraki = vrakiToTranslate.ElementAt(indexOfMatch);
                        // Dump each char from translatedFromVraki String into translatedList.
                        foreach (char c in translatedFromVraki)
                        {
                            translatedList.Add(c);
                        }
                        // Advance to after VrakiText
                        i += 6;
                    }
                    else
                    {
                        translatedList.Add(toTranslate.ElementAt(i));
                    }
                    
                    possibleMatches.Clear();
                }
            }
            translated = buildOutput(translatedList);
            return translated;
        }

        #endregion  Vraki Structure Algorithms

        // Responsible for either changing everything into lowercase or fixing uppercase usage in translated sequences,
        #region Letter Case Algorithms

        // For any chars starting
        private string resolveLetterCase(string toResolve)
        {
            List<Char> resolvedletterCaseList = new List<Char>();
            String resolvedLetterCase = "";
            int resolveSize = toResolve.Length - 1;

            // Process the first char of the toResolve String before
            // This is so that we don't have to deal with it over every single iteration.
            String upperCaseChar = toResolve.ElementAt(0).ToString();
            if (alphabet.Contains(toResolve.ElementAt(0)))
                upperCaseChar = upperCaseChar.ToUpper();
            resolvedletterCaseList.Add(upperCaseChar.ElementAt(0));
            if (resolveSize < 3) {
                bool firstChar = true;
                foreach (char c in toResolve)
                {
                    if (firstChar)
                    {
                        firstChar = false;
                    }
                    else
                    {
                        resolvedletterCaseList.Add(c);
                    }
                }
                resolvedLetterCase = buildOutput(resolvedletterCaseList);
                return resolvedLetterCase;
            }

            // If the following char after a UpperCase trigger is a letter, just work on it and ignore everything else,
            // Else if it is not, then Uppercase the following char and call it good.
            // Unless it is a '-'. If it follows the "t-xyz" pattern where t !alphabet and xyz is, then uppercase the x.
            int i = 0;
            for (i = 1; i <= (resolveSize - 2); i++)
            {
                Char previousChar = toResolve.ElementAt(i - 1);
                Char currentChar = toResolve.ElementAt(i);
                Char nextChar = toResolve.ElementAt(i + 1);
                Char afterNextChar = toResolve.ElementAt(i + 2);
                resolvedletterCaseList.Add(currentChar);

                if (wordBreaks.Contains(previousChar) && currentChar == '-' && alphabet.Contains(nextChar))
                {
                    upperCaseChar = nextChar.ToString();
                    upperCaseChar = upperCaseChar.ToUpper();
                    resolvedletterCaseList.Add(upperCaseChar.ElementAt(0));
                    i++;
                }
                else if (toUpperCaseTriggers.Contains(currentChar) && alphabet.Contains(nextChar))
                {
                    upperCaseChar = nextChar.ToString();
                    upperCaseChar = upperCaseChar.ToUpper();
                    resolvedletterCaseList.Add(upperCaseChar.ElementAt(0));
                    i++;
                }
                else if (toUpperCaseTriggers.Contains(currentChar) && !alphabet.Contains(nextChar) && alphabet.Contains(afterNextChar))
                {
                    upperCaseChar = nextChar.ToString();
                    upperCaseChar += afterNextChar.ToString();
                    upperCaseChar = upperCaseChar.ToUpper();
                    resolvedletterCaseList.Add(upperCaseChar.ElementAt(0));
                    resolvedletterCaseList.Add(upperCaseChar.ElementAt(1));
                    i += 2;
                }
            }
            // In case no change is made based from the char located two places before the end, then just add them all and call it quits.
            if (i > (resolveSize - 2))
            {
                Char previousChar = toResolve.ElementAt(i - 1);
                Char currentChar = toResolve.ElementAt(i);
                Char nextChar = toResolve.ElementAt(i + 1);
                resolvedletterCaseList.Add(currentChar);
                if (i == (resolveSize - 2))
                {
                    Char afterNextChar = toResolve.ElementAt(i + 2);
                    resolvedletterCaseList.Add(nextChar);
                    resolvedletterCaseList.Add(afterNextChar);
                }
                else
                {
                    resolvedletterCaseList.Add(nextChar);
                }
            }
            resolvedLetterCase = buildOutput(resolvedletterCaseList);
            return resolvedLetterCase;
        }

        #endregion  Letter Case Algorithms
        
        // Shared methods include buildOutput(L<String> > String) and stuff of the sorts.
        #region Shared Algorithms Methods

        private String buildOutput(List<Char> raw)
        {
            String formatted = "";
            for (int i = 0; i < raw.Count; i++)
            {
                formatted += raw.ElementAt(i);
            }
            return formatted;
        }

        private int findOddMedian(int tempReverseSize)
        {
            int middle = (tempReverseSize - 1) / 2;
            return middle + 1;
        }

        private bool isOdd(int tempReverseSize)
        {
            if (tempReverseSize % 2 != 0) {
                return true;
            }
            return false;
            
        }

        #endregion Shared Algorithms Methods

    }
}
