from bs4 import BeautifulSoup
import json
import os
from typing import List, Dict, Any, Set
from collections import defaultdict

class QuizExtractor:
    def __init__(self, html_file: str):
        """Initialize the quiz extractor with an HTML file path"""
        self.html_file = html_file
        with open(html_file, 'r', encoding='utf-8') as f:
            self.soup = BeautifulSoup(f.read(), 'html.parser')
            
    def extract_questions(self) -> List[Dict[str, Any]]:
        """Extract all questions from the quiz HTML file"""
        questions = []
        # Find all question divs
        question_divs = self.soup.find_all('div', class_='que')
        
        for div in question_divs:
            question = self._extract_question(div)
            if question:
                questions.append(question)
                
        return questions
    
    def _extract_question(self, div) -> Dict[str, Any]:
        """Extract a single question's data from a div element"""
        # Get question text
        qtext_div = div.find('div', class_='qtext')
        if not qtext_div:
            return None
            
        question_text = qtext_div.get_text(strip=True)
        
        # Get question type (single/multiple choice)
        answer_div = div.find('div', class_='answer')
        if not answer_div:
            return None
            
        # Check if it's a true/false question
        if 'truefalse' in div.get('class', []):
            question_type = 'truefalse'
        else:
            # Check input type to determine if single or multiple choice
            first_input = answer_div.find('input')
            if first_input and first_input.get('type') == 'checkbox':
                question_type = 'multiple'
            else:
                question_type = 'single'
        
        # Get options
        options = []
        option_divs = answer_div.find_all(['div'], class_=['r0', 'r1'])
        for opt_div in option_divs:
            # Get option text
            opt_text_div = opt_div.find('div', class_='flex-fill')
            if not opt_text_div:
                continue
                
            option_text = opt_text_div.get_text(strip=True)
            
            # Check if this is the correct answer
            is_correct = 'correct' in opt_div.get('class', [])
            
            options.append({
                'text': option_text,
                'isCorrect': is_correct
            })
            
        # Get correct answers from feedback
        correct_answers = []
        feedback_div = div.find('div', class_='feedback')
        if feedback_div:
            right_answer_div = feedback_div.find('div', class_='rightanswer')
            if right_answer_div:
                right_answer_text = right_answer_div.get_text(strip=True)
                # Extract answers from text like "The correct answer is: X" or "The correct answers are: X, Y"
                if ':' in right_answer_text:
                    answers = right_answer_text.split(':', 1)[1].strip()
                    correct_answers = [a.strip() for a in answers.split(',')]
        
        return {
            'question': question_text,
            'type': question_type,
            'options': options,
            'correctAnswers': correct_answers
        }

def remove_duplicate_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove duplicate questions based on question text"""
    seen_questions = set()
    unique_questions = []
    
    for q in questions:
        # Create a unique key for the question based on its text
        question_key = q['question'].lower().strip()
        
        if question_key not in seen_questions:
            seen_questions.add(question_key)
            unique_questions.append(q)
            
    return unique_questions

def process_quiz_files(directory: str) -> Dict[str, List[Dict[str, Any]]]:
    """Process all quiz HTML files in a directory"""
    quiz_data = {}
    all_questions = []
    
    for filename in os.listdir(directory):
        if filename.endswith('.html'):
            file_path = os.path.join(directory, filename)
            extractor = QuizExtractor(file_path)
            questions = extractor.extract_questions()
            all_questions.extend(questions)
    
    # Remove duplicates from all questions
    unique_questions = remove_duplicate_questions(all_questions)
    quiz_data['questions'] = unique_questions
    
    return quiz_data

def save_to_json(data: Dict[str, List[Dict[str, Any]]], output_file: str):
    """Save extracted quiz data to a JSON file"""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    # List of all quiz directories
    quiz_dirs = [
        'Quiz 1',
        'Quiz 2',
        'Quiz 3',
        'Quiz 5',
        'Quiz 6',
        'Quiz 7',
        'Quiz 8',
        'Quiz 9',
        'Quiz 10'
    ]
    
    all_quiz_data = {}
    
    # Process each quiz directory
    for quiz_dir in quiz_dirs:
        if os.path.exists(quiz_dir):
            print(f"Processing {quiz_dir}...")
            quiz_data = process_quiz_files(quiz_dir)
            all_quiz_data[quiz_dir] = quiz_data
            
    # Save all data to a single JSON file
    save_to_json(all_quiz_data, 'qu~z_database.json')
    print("Data extraction completed. Results saved to quiz_database.json") 