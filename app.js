// Quiz Application
class QuizApp {
    constructor() {
        this.quizData = null;
        this.currentQuiz = null;
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.timer = null;
        this.timeRemaining = 0;
        this.startTime = null;
        this.settings = {
            questionCount: 10,
            timeLimit: 0, // 0 = unlimited
            shuffleQuestions: true,
            shuffleAnswers: true,
            showExplanations: false
        };
        this.quizMode = null; // 'specific', 'random', 'all'
        this.selectedQuizName = null;
        
        // Study mode variables
        this.studyMode = false;
        this.studyQuestions = [];
        this.studyQuestionIndex = 0;
        this.studyQuizName = null;
        
        this.init();
    }

    async init() {
        await this.loadQuizData();
        this.setupEventListeners();
        this.hideLoading();
    }

    async loadQuizData() {
        try {
            this.showLoading();
            const response = await fetch('qu~z_database.json');
            this.quizData = await response.json();
            console.log('Quiz data loaded successfully:', Object.keys(this.quizData).length, 'quizzes');
        } catch (error) {
            console.error('Error loading quiz data:', error);
            this.showMessage('Lỗi tải dữ liệu', 'Không thể tải dữ liệu quiz. Vui lòng kiểm tra file qu~z_database.json', 'error');
        }
    }

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            } else if (e.key === 'Enter') {
                this.handleEnterKey();
            } else if (e.key >= '1' && e.key <= '9') {
                this.handleNumberKey(parseInt(e.key) - 1);
            }
        });
    }

    handleEscapeKey() {
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen.id === 'quizScreen') {
            this.confirmExit();
        } else if (currentScreen.id === 'studyScreen') {
            this.exitStudy();
        } else if (currentScreen.id !== 'homeScreen') {
            this.showHome();
        }
    }

    handleEnterKey() {
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen.id === 'quizScreen') {
            this.nextQuestion();
        } else if (currentScreen.id === 'studyScreen') {
            this.nextStudyQuestion();
        }
    }

    handleNumberKey(index) {
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen.id === 'quizScreen') {
            const options = document.querySelectorAll('.answer-option');
            if (options[index]) {
                options[index].click();
            }
        }
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    showHome() {
        this.showScreen('homeScreen');
        this.stopTimer();
        this.studyMode = false;
    }

    showQuizSelection() {
        this.showScreen('quizSelectionScreen');
        this.populateQuizList();
    }

    showStudySelection() {
        this.showScreen('studySelectionScreen');
        this.populateStudyQuizList();
    }

    showRandomQuiz() {
        this.quizMode = 'random';
        this.selectedQuizName = 'Random Quiz';
        this.showSettings();
    }

    showAllQuizzes() {
        this.quizMode = 'all';
        this.selectedQuizName = 'Tất Cả Quiz';
        this.showSettings();
    }

    populateQuizList() {
        const quizList = document.getElementById('quizList');
        quizList.innerHTML = '';

        Object.keys(this.quizData).forEach(quizName => {
            const quiz = this.quizData[quizName];
            const questionCount = quiz.questions.length;
            
            const quizItem = document.createElement('div');
            quizItem.className = 'quiz-item';
            quizItem.onclick = () => this.selectQuiz(quizName);
            
            quizItem.innerHTML = `
                <h3>${quizName}</h3>
                <p>Ôn tập các câu hỏi từ ${quizName}</p>
                <div class="quiz-stats">
                    <span><i class="fas fa-question-circle"></i> ${questionCount} câu hỏi</span>
                    <span><i class="fas fa-clock"></i> Thời gian linh hoạt</span>
                </div>
            `;
            
            quizList.appendChild(quizItem);
        });
    }

    populateStudyQuizList() {
        const studyQuizList = document.getElementById('studyQuizList');
        studyQuizList.innerHTML = '';

        Object.keys(this.quizData).forEach(quizName => {
            const quiz = this.quizData[quizName];
            const questionCount = quiz.questions.length;
            
            const quizItem = document.createElement('div');
            quizItem.className = 'quiz-item';
            quizItem.onclick = () => this.startStudyMode(quizName);
            
            quizItem.innerHTML = `
                <h3>${quizName}</h3>
                <p>Xem tất cả câu hỏi và đáp án đúng</p>
                <div class="quiz-stats">
                    <span><i class="fas fa-book-open"></i> ${questionCount} câu hỏi</span>
                    <span><i class="fas fa-eye"></i> Chế độ ôn tập</span>
                </div>
            `;
            
            studyQuizList.appendChild(quizItem);
        });
    }

    selectQuiz(quizName) {
        this.quizMode = 'specific';
        this.selectedQuizName = quizName;
        this.showSettings();
    }

    startStudyMode(quizName) {
        this.studyMode = true;
        this.studyQuizName = quizName;
        this.studyQuestions = [...this.quizData[quizName].questions];
        this.studyQuestionIndex = 0;
        
        this.showScreen('studyScreen');
        this.displayStudyQuestion();
        this.updateStudyProgress();
    }

    showSettings() {
        this.showScreen('settingsScreen');
        this.updateSettingsUI();
    }

    updateSettingsUI() {
        const questionCountInput = document.getElementById('questionCount');
        
        if (this.quizMode === 'specific') {
            const maxQuestions = this.quizData[this.selectedQuizName].questions.length;
            questionCountInput.max = maxQuestions;
            questionCountInput.value = Math.min(this.settings.questionCount, maxQuestions);
        } else if (this.quizMode === 'random') {
            const totalQuestions = this.getTotalQuestionCount();
            questionCountInput.max = totalQuestions;
            questionCountInput.min = 10;
            questionCountInput.value = Math.min(this.settings.questionCount, totalQuestions);
        } else if (this.quizMode === 'all') {
            const totalQuestions = this.getTotalQuestionCount();
            questionCountInput.value = totalQuestions;
            questionCountInput.disabled = true;
        }
    }

    getTotalQuestionCount() {
        let total = 0;
        Object.values(this.quizData).forEach(quiz => {
            total += quiz.questions.length;
        });
        return total;
    }

    goBackFromSettings() {
        if (this.quizMode === 'specific') {
            this.showQuizSelection();
        } else {
            this.showHome();
        }
    }

    setTimeLimit(seconds) {
        this.settings.timeLimit = seconds;
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }

    startQuiz() {
        this.updateSettingsFromUI();
        this.prepareQuestions();
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.startTime = new Date();
        
        this.showScreen('quizScreen');
        this.startTimer();
        this.displayQuestion();
        this.updateProgress();
    }

    updateSettingsFromUI() {
        this.settings.questionCount = parseInt(document.getElementById('questionCount').value);
        this.settings.shuffleQuestions = document.getElementById('shuffleQuestions').checked;
        this.settings.shuffleAnswers = document.getElementById('shuffleAnswers').checked;
        this.settings.showExplanations = document.getElementById('showExplanations').checked;
    }

    prepareQuestions() {
        let allQuestions = [];
        
        if (this.quizMode === 'specific') {
            allQuestions = [...this.quizData[this.selectedQuizName].questions];
        } else if (this.quizMode === 'random') {
            Object.values(this.quizData).forEach(quiz => {
                quiz.questions.forEach(question => {
                    allQuestions.push({...question});
                });
            });
        } else if (this.quizMode === 'all') {
            Object.values(this.quizData).forEach(quiz => {
                quiz.questions.forEach(question => {
                    allQuestions.push({...question});
                });
            });
        }

        // Remove duplicates based on question text
        const uniqueQuestions = this.removeDuplicateQuestions(allQuestions);
        
        // Shuffle questions if enabled
        if (this.settings.shuffleQuestions) {
            this.shuffleArray(uniqueQuestions);
        }
        
        // Limit number of questions
        if (this.quizMode !== 'all') {
            this.currentQuestions = uniqueQuestions.slice(0, this.settings.questionCount);
        } else {
            this.currentQuestions = uniqueQuestions;
        }
        
        // Shuffle answers if enabled
        if (this.settings.shuffleAnswers) {
            this.currentQuestions.forEach(question => {
                if (question.options && question.options.length > 0) {
                    this.shuffleArray(question.options);
                }
            });
        }
        
        // Initialize user answers array
        this.userAnswers = new Array(this.currentQuestions.length).fill(null);
        
        console.log('Questions prepared:', this.currentQuestions.length);
    }

    removeDuplicateQuestions(questions) {
        const seen = new Set();
        return questions.filter(question => {
            const key = question.question.toLowerCase().trim();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    startTimer() {
        if (this.settings.timeLimit > 0) {
            this.timeRemaining = this.settings.timeLimit;
            this.updateTimerDisplay();
            
            this.timer = setInterval(() => {
                this.timeRemaining--;
                this.updateTimerDisplay();
                
                if (this.timeRemaining <= 0) {
                    this.stopTimer();
                    this.finishQuiz();
                }
            }, 1000);
        } else {
            document.getElementById('timeDisplay').textContent = '∞';
        }
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        document.getElementById('timeDisplay').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    displayQuestion() {
        const question = this.currentQuestions[this.currentQuestionIndex];
        
        document.getElementById('currentQuestion').textContent = this.currentQuestionIndex + 1;
        document.getElementById('totalQuestions').textContent = this.currentQuestions.length;
        document.getElementById('questionText').innerHTML = this.formatQuestionText(question.question);
        
        this.displayAnswers(question);
        this.updateNavigationButtons();
    }

    displayStudyQuestion() {
        const question = this.studyQuestions[this.studyQuestionIndex];
        
        document.getElementById('studyCurrentQuestion').textContent = this.studyQuestionIndex + 1;
        document.getElementById('studyTotalQuestions').textContent = this.studyQuestions.length;
        document.getElementById('studyQuizName').textContent = this.studyQuizName;
        document.getElementById('studyQuestionText').innerHTML = this.formatQuestionText(question.question);
        
        this.displayStudyAnswers(question);
        this.updateStudyNavigationButtons();
    }

    formatQuestionText(text) {
        // Basic HTML formatting for question text
        return text.replace(/\n/g, '<br>');
    }

    displayAnswers(question) {
        const answersContainer = document.getElementById('answersContainer');
        answersContainer.innerHTML = '';
        
        if (question.type === 'truefalse') {
            this.displayTrueFalseAnswers();
        } else if (question.options && question.options.length > 0) {
            this.displayMultipleChoiceAnswers(question);
        } else {
            // Handle questions without options (possibly text input)
            answersContainer.innerHTML = '<p>Không có lựa chọn cho câu hỏi này.</p>';
        }
    }

    displayStudyAnswers(question) {
        const answersContainer = document.getElementById('studyAnswersContainer');
        answersContainer.innerHTML = '';
        
        if (question.type === 'truefalse') {
            this.displayStudyTrueFalseAnswers(question);
        } else if (question.options && question.options.length > 0) {
            this.displayStudyMultipleChoiceAnswers(question);
        } else {
            answersContainer.innerHTML = '<p>Không có lựa chọn cho câu hỏi này.</p>';
        }
    }

    displayTrueFalseAnswers() {
        const answersContainer = document.getElementById('answersContainer');
        const options = [
            { text: 'Đúng', value: 'true' },
            { text: 'Sai', value: 'false' }
        ];
        
        options.forEach((option, index) => {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer-option';
            answerDiv.onclick = () => this.selectAnswer(index, option.value);
            
            const userAnswer = this.userAnswers[this.currentQuestionIndex];
            if (userAnswer && userAnswer.includes(option.value)) {
                answerDiv.classList.add('selected');
            }
            
            answerDiv.innerHTML = `
                <div class="option-marker">${String.fromCharCode(65 + index)}</div>
                <div class="option-text">${option.text}</div>
            `;
            
            answersContainer.appendChild(answerDiv);
        });
    }

    displayStudyTrueFalseAnswers(question) {
        const answersContainer = document.getElementById('studyAnswersContainer');
        const options = [
            { text: 'Đúng', value: 'true' },
            { text: 'Sai', value: 'false' }
        ];
        
        const correctAnswers = question.correctAnswers || [];
        
        options.forEach((option, index) => {
            const answerDiv = document.createElement('div');
            const isCorrect = correctAnswers.includes(option.value);
            answerDiv.className = `study-answer-option ${isCorrect ? 'correct' : 'incorrect'}`;
            
            answerDiv.innerHTML = `
                <div class="option-marker">${String.fromCharCode(65 + index)}</div>
                <div class="option-text">${option.text}</div>
                ${isCorrect ? '<div class="correct-indicator">✓ Đúng</div>' : ''}
            `;
            
            answersContainer.appendChild(answerDiv);
        });
    }

    displayMultipleChoiceAnswers(question) {
        const answersContainer = document.getElementById('answersContainer');
        
        question.options.forEach((option, index) => {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer-option';
            answerDiv.onclick = () => this.selectAnswer(index, option.text);
            
            const userAnswer = this.userAnswers[this.currentQuestionIndex];
            if (userAnswer && userAnswer.includes(option.text)) {
                answerDiv.classList.add('selected');
            }
            
            answerDiv.innerHTML = `
                <div class="option-marker">${String.fromCharCode(65 + index)}</div>
                <div class="option-text">${option.text}</div>
            `;
            
            answersContainer.appendChild(answerDiv);
        });
    }

    displayStudyMultipleChoiceAnswers(question) {
        const answersContainer = document.getElementById('studyAnswersContainer');
        const correctAnswers = question.correctAnswers || [];
        
        question.options.forEach((option, index) => {
            const answerDiv = document.createElement('div');
            const isCorrect = correctAnswers.some(correct => 
                correct.toLowerCase().trim() === option.text.toLowerCase().trim());
            answerDiv.className = `study-answer-option ${isCorrect ? 'correct' : 'incorrect'}`;
            
            answerDiv.innerHTML = `
                <div class="option-marker">${String.fromCharCode(65 + index)}</div>
                <div class="option-text">${option.text}</div>
                ${isCorrect ? '<div class="correct-indicator">✓ Đúng</div>' : ''}
            `;
            
            answersContainer.appendChild(answerDiv);
        });
    }

    selectAnswer(index, answerText) {
        const question = this.currentQuestions[this.currentQuestionIndex];
        const answerOptions = document.querySelectorAll('.answer-option');
        
        if (question.type === 'multiple') {
            // Multiple choice - can select multiple answers
            if (!this.userAnswers[this.currentQuestionIndex]) {
                this.userAnswers[this.currentQuestionIndex] = [];
            }
            
            const currentAnswers = this.userAnswers[this.currentQuestionIndex];
            const answerIndex = currentAnswers.indexOf(answerText);
            
            if (answerIndex > -1) {
                // Remove answer
                currentAnswers.splice(answerIndex, 1);
                answerOptions[index].classList.remove('selected');
            } else {
                // Add answer
                currentAnswers.push(answerText);
                answerOptions[index].classList.add('selected');
            }
        } else {
            // Single choice - can only select one answer
            answerOptions.forEach(option => option.classList.remove('selected'));
            answerOptions[index].classList.add('selected');
            this.userAnswers[this.currentQuestionIndex] = [answerText];
        }
        
        console.log('Answer selected:', this.userAnswers[this.currentQuestionIndex]);
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        prevBtn.disabled = this.currentQuestionIndex === 0;
        
        if (this.currentQuestionIndex === this.currentQuestions.length - 1) {
            nextBtn.innerHTML = '<i class="fas fa-flag-checkered"></i> Hoàn Thành';
        } else {
            nextBtn.innerHTML = 'Tiếp <i class="fas fa-chevron-right"></i>';
        }
    }

    updateStudyNavigationButtons() {
        const prevBtn = document.getElementById('studyPrevBtn');
        const nextBtn = document.getElementById('studyNextBtn');
        
        prevBtn.disabled = this.studyQuestionIndex === 0;
        
        if (this.studyQuestionIndex === this.studyQuestions.length - 1) {
            nextBtn.innerHTML = '<i class="fas fa-home"></i> Hoàn Thành';
        } else {
            nextBtn.innerHTML = 'Tiếp <i class="fas fa-chevron-right"></i>';
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
            this.updateProgress();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
            this.updateProgress();
        } else {
            this.finishQuiz();
        }
    }

    previousStudyQuestion() {
        if (this.studyQuestionIndex > 0) {
            this.studyQuestionIndex--;
            this.displayStudyQuestion();
            this.updateStudyProgress();
        }
    }

    nextStudyQuestion() {
        if (this.studyQuestionIndex < this.studyQuestions.length - 1) {
            this.studyQuestionIndex++;
            this.displayStudyQuestion();
            this.updateStudyProgress();
        } else {
            this.exitStudy();
        }
    }

    updateProgress() {
        const progress = ((this.currentQuestionIndex + 1) / this.currentQuestions.length) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
    }

    updateStudyProgress() {
        const progress = ((this.studyQuestionIndex + 1) / this.studyQuestions.length) * 100;
        document.getElementById('studyProgressFill').style.width = progress + '%';
    }

    confirmExit() {
        this.showConfirmModal(
            'Thoát Quiz',
            'Bạn có chắc chắn muốn thoát? Tiến trình hiện tại sẽ bị mất.',
            () => this.showHome()
        );
    }

    exitStudy() {
        this.showHome();
    }

    finishQuiz() {
        this.stopTimer();
        this.calculateResults();
        this.showResults();
    }

    calculateResults() {
        let correctCount = 0;
        const detailedResults = [];
        
        this.currentQuestions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index] || [];
            const correctAnswers = question.correctAnswers || [];
            
            let isCorrect = false;
            
            if (question.type === 'truefalse') {
                // For true/false questions, check if the user's answer matches the correct answer
                const correctAnswer = correctAnswers.length > 0 ? correctAnswers[0] : '';
                isCorrect = userAnswer.length > 0 && userAnswer[0] === correctAnswer;
            } else if (question.type === 'multiple') {
                // For multiple choice, check if all correct answers are selected and no incorrect ones
                const userSet = new Set(userAnswer.map(a => a.toLowerCase().trim()));
                const correctSet = new Set(correctAnswers.map(a => a.toLowerCase().trim()));
                isCorrect = userSet.size === correctSet.size && 
                           [...userSet].every(answer => correctSet.has(answer));
            } else {
                // For single choice, check if the user's answer matches any correct answer
                const userAnswerText = userAnswer.length > 0 ? userAnswer[0].toLowerCase().trim() : '';
                isCorrect = correctAnswers.some(correct => 
                    correct.toLowerCase().trim() === userAnswerText);
            }
            
            if (isCorrect) {
                correctCount++;
            }
            
            detailedResults.push({
                question: question,
                userAnswer: userAnswer,
                correctAnswers: correctAnswers,
                isCorrect: isCorrect
            });
        });
        
        const endTime = new Date();
        const timeSpent = Math.floor((endTime - this.startTime) / 1000);
        
        this.currentResult = {
            totalQuestions: this.currentQuestions.length,
            correctAnswers: correctCount,
            percentage: Math.round((correctCount / this.currentQuestions.length) * 100),
            timeSpent: timeSpent,
            quizName: this.selectedQuizName,
            detailedResults: detailedResults,
            date: new Date().toISOString()
        };
        
        console.log('Quiz results calculated:', this.currentResult);
    }

    showResults() {
        this.showScreen('resultsScreen');
        
        const result = this.currentResult;
        document.getElementById('scorePercentage').textContent = result.percentage + '%';
        document.getElementById('correctAnswers').textContent = result.correctAnswers;
        document.getElementById('totalAnswers').textContent = result.totalQuestions;
        
        const timeMinutes = Math.floor(result.timeSpent / 60);
        const timeSeconds = result.timeSpent % 60;
        document.getElementById('timeTaken').textContent = 
            `${timeMinutes} phút ${timeSeconds} giây`;
        
        this.updatePerformanceBadge(result.percentage);
    }

    updatePerformanceBadge(percentage) {
        const badge = document.getElementById('performanceBadge');
        
        if (percentage >= 90) {
            badge.innerHTML = '<i class="fas fa-trophy"></i><span>Xuất sắc!</span>';
            badge.style.background = 'linear-gradient(45deg, #ffd700, #ffed4e)';
        } else if (percentage >= 80) {
            badge.innerHTML = '<i class="fas fa-star"></i><span>Tốt!</span>';
            badge.style.background = 'linear-gradient(45deg, #4caf50, #81c784)';
        } else if (percentage >= 70) {
            badge.innerHTML = '<i class="fas fa-thumbs-up"></i><span>Khá!</span>';
            badge.style.background = 'linear-gradient(45deg, #2196f3, #64b5f6)';
        } else if (percentage >= 60) {
            badge.innerHTML = '<i class="fas fa-hand-paper"></i><span>Trung bình!</span>';
            badge.style.background = 'linear-gradient(45deg, #ff9800, #ffb74d)';
        } else {
            badge.innerHTML = '<i class="fas fa-redo"></i><span>Cần cải thiện!</span>';
            badge.style.background = 'linear-gradient(45deg, #f44336, #e57373)';
        }
    }

    reviewAnswers() {
        this.showScreen('reviewScreen');
        this.displayReview();
    }

    displayReview() {
        const reviewContainer = document.getElementById('reviewContainer');
        reviewContainer.innerHTML = '';
        
        this.currentResult.detailedResults.forEach((result, index) => {
            const reviewDiv = document.createElement('div');
            reviewDiv.className = 'review-question';
            
            const questionNumber = index + 1;
            const isCorrect = result.isCorrect;
            const question = result.question;
            const userAnswer = result.userAnswer || [];
            const correctAnswers = result.correctAnswers || [];
            
            reviewDiv.innerHTML = `
                <div class="review-question-header">
                    <div class="question-number">Câu ${questionNumber}</div>
                    <div class="result-indicator ${isCorrect ? 'correct' : 'incorrect'}">
                        ${isCorrect ? '✓ Đúng' : '✗ Sai'}
                    </div>
                </div>
                <div class="review-question-text">${this.formatQuestionText(question.question)}</div>
                <div class="review-answers">
                    ${this.generateReviewAnswers(question, userAnswer, correctAnswers)}
                </div>
            `;
            
            reviewContainer.appendChild(reviewDiv);
        });
    }

    generateReviewAnswers(question, userAnswer, correctAnswers) {
        let html = '';
        
        if (question.type === 'truefalse') {
            const options = [
                { text: 'Đúng', value: 'true' },
                { text: 'Sai', value: 'false' }
            ];
            
            options.forEach(option => {
                const isUserSelected = userAnswer.includes(option.value);
                const isCorrect = correctAnswers.includes(option.value);
                
                let classes = 'review-answer';
                if (isUserSelected) classes += ' user-selected';
                if (isCorrect) classes += ' correct-answer';
                if (isUserSelected && !isCorrect) classes += ' incorrect-selected';
                
                html += `
                    <div class="${classes}">
                        <strong>${option.text}</strong>
                        ${isUserSelected ? ' (Bạn đã chọn)' : ''}
                        ${isCorrect ? ' (Đáp án đúng)' : ''}
                    </div>
                `;
            });
        } else if (question.options && question.options.length > 0) {
            question.options.forEach(option => {
                const isUserSelected = userAnswer.includes(option.text);
                const isCorrect = correctAnswers.some(correct => 
                    correct.toLowerCase().trim() === option.text.toLowerCase().trim());
                
                let classes = 'review-answer';
                if (isUserSelected) classes += ' user-selected';
                if (isCorrect) classes += ' correct-answer';
                if (isUserSelected && !isCorrect) classes += ' incorrect-selected';
                
                html += `
                    <div class="${classes}">
                        ${option.text}
                        ${isUserSelected ? ' (Bạn đã chọn)' : ''}
                        ${isCorrect ? ' (Đáp án đúng)' : ''}
                    </div>
                `;
            });
        }
        
        return html;
    }

    restartQuiz() {
        this.showSettings();
    }

    showConfirmModal(title, message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        
        const confirmBtn = document.getElementById('confirmBtn');
        confirmBtn.onclick = () => {
            this.closeModal();
            onConfirm();
        };
        
        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('confirmModal').classList.remove('active');
    }

    showMessage(title, message, type = 'info') {
        // Simple alert for now, can be enhanced with custom modal
        alert(`${title}\n\n${message}`);
    }
}

// Global functions for HTML onclick handlers
function showHome() {
    app.showHome();
}

function showQuizSelection() {
    app.showQuizSelection();
}

function showStudySelection() {
    app.showStudySelection();
}

function showRandomQuiz() {
    app.showRandomQuiz();
}

function showAllQuizzes() {
    app.showAllQuizzes();
}

function goBackFromSettings() {
    app.goBackFromSettings();
}

function setTimeLimit(seconds) {
    app.setTimeLimit(seconds);
}

function startQuiz() {
    app.startQuiz();
}

function previousQuestion() {
    app.previousQuestion();
}

function nextQuestion() {
    app.nextQuestion();
}

function previousStudyQuestion() {
    app.previousStudyQuestion();
}

function nextStudyQuestion() {
    app.nextStudyQuestion();
}

function exitStudy() {
    app.exitStudy();
}

function confirmExit() {
    app.confirmExit();
}

function reviewAnswers() {
    app.reviewAnswers();
}

function showResults() {
    app.showScreen('resultsScreen');
}

function restartQuiz() {
    app.restartQuiz();
}

function closeModal() {
    app.closeModal();
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new QuizApp();
});

// Handle page visibility change (pause timer when page is hidden)
document.addEventListener('visibilitychange', () => {
    if (app && app.timer) {
        if (document.hidden) {
            // Page is hidden, could pause timer here if desired
        } else {
            // Page is visible again
        }
    }
}); 