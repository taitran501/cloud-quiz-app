import os
import json
import re
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Set, Optional
from collections import defaultdict

class QuizExtractor:
    def __init__(self, html_file: str):
        """Initialize the quiz extractor with an HTML file path"""
        self.html_file = html_file
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        self.soup = BeautifulSoup(content, 'html.parser')
        self.debug_logs = []
        
    def log_debug(self, message: str):
        """Add debug message to logs"""
        self.debug_logs.append(message)
        print(f"  🔍 {message}")
        
    def clean_text(self, text: str) -> str:
        """Clean and normalize text content"""
        if not text:
            return ""
        
        # Remove extra whitespace and newlines
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Fix common HTML parsing issues
        text = re.sub(r'<[^>]*>', '', text)  # Remove any remaining HTML tags
        text = re.sub(r'/p>', '', text)  # Fix broken </p> tags
        text = re.sub(r'&nbsp;', ' ', text)  # Replace &nbsp; with space
        text = re.sub(r'&amp;', '&', text)  # Fix HTML entities
        text = re.sub(r'&lt;', '<', text)
        text = re.sub(r'&gt;', '>', text)
        text = re.sub(r'&quot;', '"', text)
        
        return text.strip()
            
    def extract_questions(self) -> List[Dict[str, Any]]:
        """Extract all questions from the quiz HTML file"""
        questions = []
        warnings = []
        
        self.log_debug(f"Starting extraction from: {os.path.basename(self.html_file)}")
        
        # Find all question divs using multiple patterns
        question_divs = []
        
        # Pattern 1: Look for divs with id starting with 'question-'
        q_divs_1 = self.soup.find_all('div', {'id': re.compile(r'^question-\d+')})
        question_divs.extend(q_divs_1)
        
        # Pattern 2: Look for divs with class containing 'que'
        q_divs_2 = self.soup.find_all('div', class_=lambda x: x and any('que' in cls for cls in x))
        question_divs.extend(q_divs_2)
        
        # Remove duplicates while preserving order
        seen_ids = set()
        unique_question_divs = []
        for div in question_divs:
            div_id = div.get('id', '')
            if div_id and div_id not in seen_ids:
                seen_ids.add(div_id)
                unique_question_divs.append(div)
            elif not div_id:  # Handle divs without ids but with question content
                # Check if this div contains question content
                if div.find('div', class_='qtext'):
                    unique_question_divs.append(div)
        
        question_divs = unique_question_divs
        self.log_debug(f"Found {len(question_divs)} question containers")
        
        for i, div in enumerate(question_divs, 1):
            try:
                self.log_debug(f"Processing question {i}/{len(question_divs)}")
                question_data = self._extract_question(div, i)
                if question_data:
                    # Validate that question has at least one correct answer (skip essay questions)
                    if question_data.get('type') != 'essay':
                        if not question_data.get('correctAnswers') or len(question_data['correctAnswers']) == 0:
                            warning = f"❌ Question {i}: '{question_data.get('question', 'Unknown')[:50]}...' has NO correct answers!"
                            warnings.append(warning)
                            self.log_debug(warning)
                        else:
                            self.log_debug(f"✅ Question {i}: Found {len(question_data['correctAnswers'])} correct answer(s)")
                    else:
                        self.log_debug(f"📝 Question {i}: Essay question - skipping answer validation")
                    
                    questions.append(question_data)
                else:
                    self.log_debug(f"⚠️ Question {i}: Could not extract question data")
            except Exception as e:
                error_msg = f"❌ Error extracting question {i}: {e}"
                self.log_debug(error_msg)
                continue
        
        if warnings:
            print(f"\n🚨 VALIDATION WARNINGS ({len(warnings)} issues found):")
            for warning in warnings:
                print(warning)
        else:
            print(f"✅ All questions validated successfully!")
        
        return questions
    
    def _extract_question(self, div, question_num: int) -> Optional[Dict[str, Any]]:
        """Extract a single question's data from a div element"""
        
        # Get question text
        qtext_div = div.find('div', class_='qtext')
        if not qtext_div:
            self.log_debug(f"No qtext found in question {question_num}")
            return None
            
        question_text = self.clean_text(qtext_div.get_text())
        self.log_debug(f"Question text: {question_text[:60]}...")
        
        # Determine question type from div classes and content
        question_type = self._determine_question_type(div)
        self.log_debug(f"Question type: {question_type}")
        
        # Extract correct answers from rightanswer section FIRST (most reliable)
        correct_answers_from_feedback = self._extract_correct_answers_from_feedback(div)
        self.log_debug(f"Answers from feedback: {correct_answers_from_feedback}")
        
        # Get options and correct answers based on question type
        if question_type == 'truefalse':
            options, correct_answers = self._extract_truefalse_data(div, correct_answers_from_feedback)
        elif question_type == 'essay':
            options, correct_answers = [], []  # Essays don't have predefined options/answers
        elif question_type in ['multiple', 'single']:
            options, correct_answers = self._extract_choice_data(div, question_type, correct_answers_from_feedback)
        else:
            options, correct_answers = self._extract_choice_data(div, 'single', correct_answers_from_feedback)
        
        self.log_debug(f"Final correct answers: {correct_answers}")
        self.log_debug(f"Options count: {len(options)}")
        
        return {
            'question': question_text,
            'type': question_type,
            'options': options,
            'correctAnswers': correct_answers
        }
    
    def _determine_question_type(self, div) -> str:
        """Determine the type of question based on div classes and content"""
        div_classes = ' '.join(div.get('class', []))
        
        # Check for essay type
        if 'essay' in div_classes:
            return 'essay'
        
        # Check for true/false type
        if 'truefalse' in div_classes:
            return 'truefalse'
            
        # Check for multichoice type and determine if single or multiple
        if 'multichoice' in div_classes:
            # Look for input types in answer div
            answer_div = div.find('div', class_='answer')
            if answer_div:
                # Count checkboxes vs radio buttons
                checkboxes = answer_div.find_all('input', type='checkbox')
                radio_buttons = answer_div.find_all('input', type='radio')
                
                # Filter out true/false specific inputs
                choice_checkboxes = [cb for cb in checkboxes if not any(x in cb.get('id', '') for x in ['answertrue', 'answerfalse'])]
                choice_radios = [rb for rb in radio_buttons if not any(x in rb.get('id', '') for x in ['answertrue', 'answerfalse'])]
                
                if choice_checkboxes and len(choice_checkboxes) > 0:
                    return 'multiple'
                elif choice_radios and len(choice_radios) > 0:
                    return 'single'
        
        return 'single'  # default
    
    def _extract_truefalse_data(self, div, correct_answers_from_feedback: List[str]) -> tuple:
        """Extract data for true/false questions"""
        options = [
            {'text': 'True', 'isCorrect': False},
            {'text': 'False', 'isCorrect': False}
        ]
        
        correct_answers = []
        
        # Use feedback answers if available
        if correct_answers_from_feedback:
            for answer in correct_answers_from_feedback:
                answer_lower = answer.lower()
                if any(word in answer_lower for word in ['đúng', 'true', 'correct']):
                    options[0]['isCorrect'] = True
                    correct_answers.append('True')
                elif any(word in answer_lower for word in ['sai', 'false', 'incorrect']):
                    options[1]['isCorrect'] = True
                    correct_answers.append('False')
        
        # Fallback: check student answers if no feedback
        if not correct_answers:
            answer_div = div.find('div', class_='answer')
            if answer_div:
                correct_containers = answer_div.find_all('div', class_=lambda x: x and 'correct' in x)
                
                for container in correct_containers:
                    true_input = container.find('input', id=lambda x: x and 'answertrue' in x)
                    false_input = container.find('input', id=lambda x: x and 'answerfalse' in x)
                    
                    if true_input:
                        options[0]['isCorrect'] = True
                        correct_answers.append('True')
                    elif false_input:
                        options[1]['isCorrect'] = True
                        correct_answers.append('False')
        
        return options, correct_answers
    
    def _extract_choice_data(self, div, question_type: str, correct_answers_from_feedback: List[str]) -> tuple:
        """Extract data for multiple choice and single choice questions"""
        options = []
        
        answer_div = div.find('div', class_='answer')
        if not answer_div:
            return options, correct_answers_from_feedback
        
        # Find all option containers - look for both 'r0' and 'r1' patterns
        option_containers = answer_div.find_all('div', class_=re.compile(r'^r[01](\s|$)'))
        
        self.log_debug(f"Found {len(option_containers)} option containers")
        
        for idx, container in enumerate(option_containers):
            # Get option text from the flex-fill div
            text_div = container.find('div', class_='flex-fill')
            if not text_div:
                # Try alternative patterns
                text_divs = container.find_all('div')
                for td in text_divs:
                    if td.get_text().strip() and 'answernumber' not in td.get('class', []):
                        text_div = td
                        break
            
            if not text_div:
                self.log_debug(f"No text found for option {idx}")
                continue
                
            option_text = self.clean_text(text_div.get_text())
            
            # Remove option prefixes (a., b., c., d.)
            option_text = re.sub(r'^[a-z]\.\s*', '', option_text, flags=re.IGNORECASE)
            
            self.log_debug(f"Option {idx}: {option_text[:40]}...")
            
            # Check if this option is correct based on feedback
            is_correct = self._is_option_correct(option_text, correct_answers_from_feedback, container)
            
            options.append({
                'text': option_text,
                'isCorrect': is_correct
            })
        
        # Create final correct answers list
        correct_answers = []
        for option in options:
            if option['isCorrect']:
                correct_answers.append(option['text'])
        
        # If we couldn't match feedback to options, use feedback directly
        if not correct_answers and correct_answers_from_feedback:
            correct_answers = correct_answers_from_feedback
            self.log_debug(f"Using feedback answers directly: {correct_answers}")
        
        return options, correct_answers
    
    def _is_option_correct(self, option_text: str, feedback_answers: List[str], container) -> bool:
        """Check if an option is correct based on feedback and container classes"""
        
        # First check feedback answers
        for feedback_answer in feedback_answers:
            if self._fuzzy_match(option_text, feedback_answer):
                return True
        
        # Fallback: check container classes (less reliable)
        container_classes = container.get('class', [])
        if 'correct' in container_classes:
            return True
            
        return False
    
    def _fuzzy_match(self, option_text: str, correct_answer: str) -> bool:
        """Check if option text matches correct answer with fuzzy matching"""
        option_clean = self.clean_text(option_text).lower().strip()
        answer_clean = self.clean_text(correct_answer).lower().strip()
        
        # Exact match
        if option_clean == answer_clean:
            return True
        
        # Remove common prefixes for matching
        option_core = re.sub(r'^[a-d]\.\s*', '', option_clean)
        answer_core = re.sub(r'^[a-d]\.\s*', '', answer_clean)
        
        if option_core == answer_core:
            return True
        
        # Partial match for longer answers (but be more conservative)
        if len(answer_clean) > 15:
            if answer_clean in option_clean or option_clean in answer_clean:
                return True
        
        # Check if all words in the answer are in the option
        answer_words = set(answer_core.split())
        option_words = set(option_core.split())
        
        if len(answer_words) > 2 and answer_words.issubset(option_words):
            return True
        
        return False
    
    def _extract_correct_answers_from_feedback(self, div) -> List[str]:
        """Extract correct answers from the feedback section - MOST RELIABLE SOURCE"""
        correct_answers = []
        
        feedback_div = div.find('div', class_='feedback')
        if not feedback_div:
            return correct_answers
            
        right_answer_div = feedback_div.find('div', class_='rightanswer')
        if not right_answer_div:
            return correct_answers
            
        right_answer_text = self.clean_text(right_answer_div.get_text())
        self.log_debug(f"Rightanswer text: {right_answer_text}")
        
        if not right_answer_text:
            return correct_answers
        
        # Handle different feedback formats
        answers_part = ""
        
        if ':' in right_answer_text:
            # Format: "The correct answer is: Answer" or "The correct answers are: A, B, C"
            answers_part = right_answer_text.split(':', 1)[1].strip()
        elif '"' in right_answer_text:
            # Format: "Đáp án chính xác là "Đúng""
            quotes_match = re.findall(r'"([^"]+)"', right_answer_text)
            if quotes_match:
                answers_part = ', '.join(quotes_match)
        elif any(word in right_answer_text.lower() for word in ['answer is', 'answer are', 'đáp án', 'correct']):
            # Try to extract answer after key phrases
            for phrase in ['answer is', 'answer are', 'đáp án chính xác là', 'correct answer is']:
                if phrase in right_answer_text.lower():
                    parts = right_answer_text.lower().split(phrase)
                    if len(parts) > 1:
                        answers_part = parts[1].strip()
                        break
        else:
            answers_part = right_answer_text
        
        if answers_part:
            # Check if this looks like a single answer or multiple answers
            if (',' in answers_part or ';' in answers_part or 
                (answers_part.lower().count(' and ') > 1) or  # Multiple "and"s indicate list
                'answers are:' in right_answer_text.lower()):  # Explicit plural
                # Split by obvious delimiters only
                raw_answers = re.split(r'[,،;]|\bvà\b', answers_part)
            else:
                # Treat as single answer (don't split on "and")
                raw_answers = [answers_part]
            
            for answer in raw_answers:
                clean_answer = self.clean_text(answer).strip()
                # Filter out common non-answer words and short meaningless fragments
                filter_words = ['are', 'is', 'the', 'correct', 'answer', 'answers', 'đáp án', 'chính xác', 'là', 'a', 'an']
                if (clean_answer and 
                    len(clean_answer) > 2 and 
                    clean_answer.lower() not in filter_words and
                    not re.match(r'^[a-d]\.?\s*$', clean_answer.lower())):
                    correct_answers.append(clean_answer)
        
        return correct_answers

def remove_duplicate_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove duplicate questions based on question text"""
    seen_questions = set()
    unique_questions = []
    
    for q in questions:
        # Create a unique key for the question based on its text
        question_key = q['question'].lower().strip()
        question_key = re.sub(r'\s+', ' ', question_key)  # Normalize whitespace
        
        if question_key not in seen_questions:
            seen_questions.add(question_key)
            unique_questions.append(q)
    
    return unique_questions

def validate_and_report_questions(questions: List[Dict[str, Any]], source_file: str) -> List[Dict[str, Any]]:
    """Validate questions and provide detailed reporting"""
    validated_questions = []
    issues = []
    
    print(f"\n📊 VALIDATING {len(questions)} questions from {os.path.basename(source_file)}:")
    
    for i, q in enumerate(questions, 1):
        has_issues = False
        
        # Skip validation for essay questions
        if q.get('type') == 'essay':
            validated_questions.append(q)
            continue
        
        # Check if question has correct answers
        if not q.get('correctAnswers') or len(q['correctAnswers']) == 0:
            issues.append(f"❌ Q{i}: '{q.get('question', 'Unknown')[:40]}...' has NO correct answers")
            has_issues = True
        
        # Check if options exist for choice questions
        if q.get('type') in ['single', 'multiple'] and (not q.get('options') or len(q.get('options', [])) == 0):
            issues.append(f"⚠️  Q{i}: '{q.get('question', 'Unknown')[:40]}...' has NO options")
            has_issues = True
        
        # Check if correct answers match options (for validation, not fixing)
        if q.get('options') and q.get('correctAnswers'):
            option_texts = [opt['text'] for opt in q['options']]
            for correct_answer in q['correctAnswers']:
                if not any(correct_answer in opt_text or opt_text in correct_answer for opt_text in option_texts):
                    issues.append(f"⚠️  Q{i}: Correct answer '{correct_answer[:30]}...' not clearly matching any option")
        
        # Mark question with issues
        if has_issues:
            q['_validation_issues'] = True
        
        validated_questions.append(q)
    
    # Print summary
    issues_count = len([q for q in validated_questions if q.get('_validation_issues')])
    if issues:
        print(f"📋 Found {len(issues)} validation issues:")
        for issue in issues[:10]:  # Show first 10 issues
            print(f"    {issue}")
        if len(issues) > 10:
            print(f"    ... and {len(issues) - 10} more issues")
    
    print(f"✅ Processed: {len(validated_questions)} questions ({issues_count} with issues)")
    
    return validated_questions

if __name__ == '__main__':
    # Setup paths
    base_dir = '.'
    if os.path.basename(os.getcwd()) == 'quiz_app':
        base_dir = '..'
    
    quiz_dirs = []
    
    print(f"Looking for Quiz directories in: {os.path.abspath(base_dir)}")
    
    # Check for all possible quiz directories
    for i in [1, 2, 3, 5, 6, 7, 8, 9, 10]:
        quiz_dir = f'Quiz {i}'
        if os.path.exists(os.path.join(base_dir, quiz_dir)):
            quiz_dirs.append(quiz_dir)
    
    print(f"Found quiz directories: {quiz_dirs}")
    
    all_quiz_data = {}
    total_extracted = 0
    total_issues = 0
    
    # Process each quiz directory
    for quiz_dir in quiz_dirs:
        quiz_path = os.path.join(base_dir, quiz_dir)
        if os.path.exists(quiz_path):
            print(f"\n{'='*60}")
            print(f"🎯 PROCESSING {quiz_dir}")
            print(f"{'='*60}")
            
            # Process files in this quiz directory
            all_questions = []
            html_files = [f for f in os.listdir(quiz_path) if f.endswith('.html')]
            
            print(f"📂 Found {len(html_files)} HTML files")
            
            for filename in html_files:
                file_path = os.path.join(quiz_path, filename)
                print(f"\n📄 Processing: {filename}")
                try:
                    extractor = QuizExtractor(file_path)
                    questions = extractor.extract_questions()
                    print(f"    ✅ Extracted {len(questions)} questions")
                    all_questions.extend(questions)
                except Exception as e:
                    print(f"    ❌ Error processing {filename}: {e}")
            
            # Remove duplicates from this quiz
            unique_questions = remove_duplicate_questions(all_questions)
            print(f"\n🔄 Removed duplicates: {len(all_questions)} → {len(unique_questions)} unique questions")
            
            # Validate questions for this quiz
            validated_questions = validate_and_report_questions(unique_questions, quiz_dir)
            
            # Count issues
            quiz_issues = len([q for q in validated_questions if q.get('_validation_issues')])
            total_extracted += len(validated_questions)
            total_issues += quiz_issues
            
            all_quiz_data[quiz_dir] = validated_questions
            
            print(f"📊 {quiz_dir} Summary: {len(validated_questions)} questions, {quiz_issues} issues")
    
    # Save all data to JSON file
    output_file = 'quiz_database.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_quiz_data, f, ensure_ascii=False, indent=2)
    
    # Print final comprehensive summary
    print(f"\n🎉 EXTRACTION COMPLETED!")
    print(f"{'='*60}")
    print(f"📊 FINAL SUMMARY:")
    print(f"   📁 Total quizzes processed: {len(all_quiz_data)}")
    print(f"   📝 Total questions extracted: {total_extracted}")
    print(f"   ⚠️  Questions with issues: {total_issues}")
    print(f"   📄 Database saved to: {output_file}")
    print(f"   📈 Success rate: {((total_extracted - total_issues) / total_extracted * 100):.1f}%")
    
    if total_issues > 0:
        print(f"\n⚠️  Please review the {total_issues} questions with validation issues above.")
        print(f"💡 Issues are typically caused by:")
        print(f"   - Missing rightanswer sections in HTML")
        print(f"   - Malformed HTML structure")
        print(f"   - Complex answer formats requiring manual review")
    else:
        print(f"\n✅ All questions validated successfully! 🎉")