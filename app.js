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
            shuffleAnswers: true
        };
        this.quizMode = null; // 'specific', 'random'
        this.selectedQuizNames = []; // Array for multiple quiz selection
        
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
            const response = await fetch('quiz_database.json');
            this.quizData = await response.json();
            console.log('Quiz data loaded successfully:', Object.keys(this.quizData).length, 'quizzes');
        } catch (error) {
            console.error('Error loading quiz data:', error);
            this.showMessage('Lỗi tải dữ liệu', 'Không thể tải dữ liệu quiz. Vui lòng kiểm tra file quiz_database.json', 'error');
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
            } else if (e.key === 'ArrowLeft') {
                this.handleArrowLeft();
            } else if (e.key === 'ArrowRight') {
                this.handleArrowRight();
            }
        });

        // Update question count input
        const questionCountInput = document.getElementById('questionCount');
        if (questionCountInput) {
            questionCountInput.addEventListener('input', () => {
                this.updateQuestionCountInfo();
            });
        }
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

    handleArrowLeft() {
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen.id === 'quizScreen') {
            // Chuyển câu hỏi trước
            this.previousQuestion();
        } else if (currentScreen.id === 'studyScreen') {
            // Chuyển câu hỏi trước trong study mode
            this.previousStudyQuestion();
        }
    }

    handleArrowRight() {
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen.id === 'quizScreen') {
            // Chuyển câu hỏi tiếp theo
            this.nextQuestion();
        } else if (currentScreen.id === 'studyScreen') {
            // Chuyển câu hỏi tiếp theo trong study mode
            this.nextStudyQuestion();
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
        this.selectedQuizNames = []; // Reset selection
        this.hideKeyboardShortcuts();
    }

    showQuizSelection() {
        this.showScreen('quizSelectionScreen');
        this.selectedQuizNames = []; // Reset selection
        this.populateQuizList();
        this.updateSelectedQuizInfo();
    }

    showStudySelection() {
        this.showScreen('studySelectionScreen');
        this.populateStudyQuizList();
    }

    showRandomQuizSettings() {
        this.quizMode = 'random';
        this.selectedQuizNames = ['Quiz Ngẫu Nhiên'];
        document.getElementById('settingsTitle').textContent = 'Cài Đặt Quiz Ngẫu Nhiên';
        this.showSettings();
    }

    populateQuizList() {
        const quizList = document.getElementById('quizList');
        quizList.innerHTML = '';

        Object.keys(this.quizData).forEach(quizName => {
            const quiz = this.quizData[quizName];
            const questionCount = quiz.length;
            
            const quizItem = document.createElement('div');
            quizItem.className = 'quiz-item selectable';
            
            quizItem.innerHTML = `
                <div class="quiz-checkbox-container">
                    <input type="checkbox" id="quiz_${quizName.replace(/\s+/g, '_')}" 
                           class="quiz-checkbox" onchange="toggleQuizSelection('${quizName}')">
                    <label for="quiz_${quizName.replace(/\s+/g, '_')}" class="quiz-checkbox-label">
                        <div class="quiz-info">
                            <h3>${quizName}</h3>
                            <p>Làm quiz từ ${quizName} với các quiz khác đã chọn</p>
                            <div class="quiz-stats">
                                <span><i class="fas fa-question-circle"></i> ${questionCount} câu hỏi có sẵn</span>
                                <span><i class="fas fa-clock"></i> Thời gian linh hoạt</span>
                            </div>
                        </div>
                        <div class="checkbox-indicator">
                            <i class="fas fa-check"></i>
                        </div>
                    </label>
                </div>
            `;
            
            quizList.appendChild(quizItem);
        });
    }

    toggleQuizSelection(quizName) {
        const index = this.selectedQuizNames.indexOf(quizName);
        if (index > -1) {
            this.selectedQuizNames.splice(index, 1);
        } else {
            this.selectedQuizNames.push(quizName);
        }
        this.updateSelectedQuizInfo();
    }

    selectAllQuizzes() {
        this.selectedQuizNames = Object.keys(this.quizData);
        this.updateQuizCheckboxes();
        this.updateSelectedQuizInfo();
    }

    clearAllQuizzes() {
        this.selectedQuizNames = [];
        this.updateQuizCheckboxes();
        this.updateSelectedQuizInfo();
    }

    updateQuizCheckboxes() {
        const checkboxes = document.querySelectorAll('.quiz-checkbox');
        checkboxes.forEach(checkbox => {
            const quizName = checkbox.id.replace('quiz_', '').replace(/_/g, ' ');
            checkbox.checked = this.selectedQuizNames.includes(quizName);
        });
    }

    updateSelectedQuizInfo() {
        document.getElementById('selectedQuizCount').textContent = this.selectedQuizNames.length;
        const proceedBtn = document.getElementById('proceedBtn');
        
        if (this.selectedQuizNames.length > 0) {
            proceedBtn.disabled = false;
            proceedBtn.innerHTML = `
                <i class="fas fa-arrow-right"></i>
                Tiếp Tục Với ${this.selectedQuizNames.length} Quiz
            `;
        } else {
            proceedBtn.disabled = true;
            proceedBtn.innerHTML = `
                <i class="fas fa-arrow-right"></i>
                Tiếp Tục Với Quiz Đã Chọn
            `;
        }
    }

    proceedToSettings() {
        if (this.selectedQuizNames.length === 0) {
            this.showMessage('Chưa chọn quiz', 'Vui lòng chọn ít nhất 1 quiz để tiếp tục');
            return;
        }
        
        this.quizMode = 'specific';
        const quizText = this.selectedQuizNames.length === 1 ? this.selectedQuizNames[0] : `${this.selectedQuizNames.length} Quiz`;
        document.getElementById('settingsTitle').textContent = `Cài Đặt - ${quizText}`;
        this.showSettings();
    }

    populateStudyQuizList() {
        const studyQuizList = document.getElementById('studyQuizList');
        studyQuizList.innerHTML = '';

        Object.keys(this.quizData).forEach(quizName => {
            const quiz = this.quizData[quizName];
            const questionCount = quiz.length;
            
            const quizItem = document.createElement('div');
            quizItem.className = 'quiz-item';
            quizItem.onclick = () => this.startStudyMode(quizName);
            
            quizItem.innerHTML = `
                <h3>${quizName}</h3>
                <p>Xem tất cả câu hỏi và đáp án đúng để học</p>
                <div class="quiz-stats">
                    <span><i class="fas fa-book-open"></i> ${questionCount} câu hỏi</span>
                    <span><i class="fas fa-eye"></i> Chế độ ôn tập</span>
                </div>
            `;
            
            studyQuizList.appendChild(quizItem);
        });
    }

    startStudyMode(quizName) {
        this.studyMode = true;
        this.studyQuizName = quizName;
        this.studyQuestions = [...this.quizData[quizName]];
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
        const maxQuestions = this.getTotalQuestionCount();
        document.getElementById('maxQuestionInfo').textContent = `Tối đa: ${maxQuestions} câu`;
        
        const questionCountInput = document.getElementById('questionCount');
        questionCountInput.max = maxQuestions;
        
        if (questionCountInput.value > maxQuestions) {
            questionCountInput.value = maxQuestions;
        }
    }

    updateQuestionCountInfo() {
        const maxQuestions = this.getTotalQuestionCount();
        const currentValue = document.getElementById('questionCount').value;
        const info = document.getElementById('maxQuestionInfo');
        
        if (parseInt(currentValue) > maxQuestions) {
            info.innerHTML = `<span style="color: red;">Tối đa: ${maxQuestions} câu</span>`;
            document.getElementById('questionCount').value = maxQuestions;
        } else {
            info.textContent = `Tối đa: ${maxQuestions} câu`;
        }
    }

    getTotalQuestionCount() {
        if (this.quizMode === 'specific') {
            // Count questions from selected quizzes
            const allQuestions = [];
            this.selectedQuizNames.forEach(quizName => {
                if (this.quizData[quizName]) {
                    allQuestions.push(...this.quizData[quizName]);
                }
            });
            return this.removeDuplicateQuestions(allQuestions).length;
        } else if (this.quizMode === 'random') {
            // Count all unique questions across all quizzes
            const allQuestions = [];
            Object.values(this.quizData).forEach(quiz => {
                allQuestions.push(...quiz);
            });
            return this.removeDuplicateQuestions(allQuestions).length;
        }
        return 1;
    }

    goBackFromSettings() {
        if (this.quizMode === 'specific') {
            this.showQuizSelection();
        } else if (this.quizMode === 'random') {
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
        this.displayQuestion();
        this.updateProgress();
        this.updateNavigationButtons();
        
        if (this.settings.timeLimit > 0) {
            this.startTimer();
        }
        
        // Update quiz name display
        const displayName = this.quizMode === 'random' ? 'Quiz Ngẫu Nhiên' : 
                           this.selectedQuizNames.length === 1 ? this.selectedQuizNames[0] : 
                           `${this.selectedQuizNames.length} Quiz`;
        document.getElementById('quizNameDisplay').textContent = displayName;
    }

    updateSettingsFromUI() {
        this.settings.questionCount = parseInt(document.getElementById('questionCount').value);
        this.settings.shuffleQuestions = document.getElementById('shuffleQuestions').checked;
        this.settings.shuffleAnswers = document.getElementById('shuffleAnswers').checked;
    }

    prepareQuestions() {
        let questions = [];
        
        if (this.quizMode === 'specific') {
            // Collect questions from selected quizzes
            this.selectedQuizNames.forEach(quizName => {
                if (this.quizData[quizName]) {
                    questions.push(...this.quizData[quizName]);
                }
            });
            // Remove duplicates
            questions = this.removeDuplicateQuestions(questions);
        } else if (this.quizMode === 'random') {
            // Collect all questions from all quizzes
            Object.values(this.quizData).forEach(quiz => {
                questions.push(...quiz);
            });
            // Remove duplicates
            questions = this.removeDuplicateQuestions(questions);
        }
        
        // Shuffle questions if enabled
        if (this.settings.shuffleQuestions) {
            this.shuffleArray(questions);
        }
        
        // Limit to requested count
        this.currentQuestions = questions.slice(0, this.settings.questionCount);
        
        // Shuffle answers for each question if enabled
        if (this.settings.shuffleAnswers) {
            this.currentQuestions.forEach(question => {
                if (question.options && question.options.length > 0) {
                    this.shuffleArray(question.options);
                }
            });
        }
        
        // Initialize user answers array
        this.userAnswers = new Array(this.currentQuestions.length).fill(null);
        
        // Update total questions display
        document.getElementById('totalQuestions').textContent = this.currentQuestions.length;
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
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    updateTimerDisplay() {
        const display = document.getElementById('timeDisplay');
        if (this.settings.timeLimit === 0) {
            display.textContent = '∞';
        } else {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            display.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (this.timeRemaining <= 60) {
                display.style.color = '#dc3545';
            } else if (this.timeRemaining <= 300) {
                display.style.color = '#ffc107';
            }
        }
    }

    displayQuestion() {
        const question = this.currentQuestions[this.currentQuestionIndex];
        document.getElementById('currentQuestion').textContent = this.currentQuestionIndex + 1;
        document.getElementById('questionText').textContent = question.question;
        
        this.displayAnswers(question);
        this.updateProgress();
        this.updateNavigationButtons();
        this.showKeyboardShortcuts();
    }

    displayStudyQuestion() {
        const question = this.studyQuestions[this.studyQuestionIndex];
        document.getElementById('studyCurrentQuestion').textContent = this.studyQuestionIndex + 1;
        document.getElementById('studyTotalQuestions').textContent = this.studyQuestions.length;
        document.getElementById('studyQuizName').textContent = this.studyQuizName;
        document.getElementById('studyQuestionText').textContent = question.question;
        
        // Display correct answers
        this.displayCorrectAnswers(question);
        
        // Display all answers for reference
        this.displayStudyAnswers(question);
        
        this.updateStudyProgress();
        this.updateStudyNavigationButtons();
        this.showKeyboardShortcuts();
    }

    displayCorrectAnswers(question) {
        const container = document.getElementById('studyCorrectAnswers');
        container.innerHTML = '';
        
        if (question.correctAnswers && question.correctAnswers.length > 0) {
            question.correctAnswers.forEach(answer => {
                const answerDiv = document.createElement('div');
                answerDiv.className = 'correct-answer-item';
                answerDiv.innerHTML = `<i class="fas fa-check"></i> ${answer}`;
                container.appendChild(answerDiv);
            });
        } else {
            container.innerHTML = '<div class="correct-answer-item">Không có thông tin đáp án</div>';
        }
    }

    displayAnswers(question) {
        const container = document.getElementById('answersContainer');
        container.innerHTML = '';
        
        if (question.type === 'truefalse') {
            this.displayTrueFalseAnswers(question);
        } else {
            this.displayMultipleChoiceAnswers(question);
        }
    }

    displayStudyAnswers(question) {
        const container = document.getElementById('studyAnswersContainer');
        container.innerHTML = '';
        container.className = 'answers-container study-mode';
        
        if (question.options && question.options.length > 0) {
            question.options.forEach((option, index) => {
                const answerDiv = document.createElement('div');
                answerDiv.className = `answer-option study-option ${option.isCorrect ? 'correct' : 'incorrect'}`;
                
                const icon = option.isCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle';
                answerDiv.innerHTML = `
                    <i class="${icon}"></i>
                    <span>${option.text}</span>
                `;
                
                container.appendChild(answerDiv);
            });
        } else {
            container.innerHTML = '<div class="no-options">Không có thông tin lựa chọn</div>';
        }
    }

    displayTrueFalseAnswers(question) {
        const container = document.getElementById('answersContainer');
        container.className = 'answers-container truefalse';
        
        const trueOption = document.createElement('div');
        trueOption.className = 'answer-option';
        trueOption.onclick = () => this.selectAnswer(0, 'True');
        trueOption.innerHTML = `
            <div class="option-letter">A</div>
            <span>Đúng (True)</span>
        `;
        
        const falseOption = document.createElement('div');
        falseOption.className = 'answer-option';
        falseOption.onclick = () => this.selectAnswer(1, 'False');
        falseOption.innerHTML = `
            <div class="option-letter">B</div>
            <span>Sai (False)</span>
        `;
        
        container.appendChild(trueOption);
        container.appendChild(falseOption);
        
        // Mark selected answer if exists
        const userAnswer = this.userAnswers[this.currentQuestionIndex];
        if (userAnswer === 'True') {
            trueOption.classList.add('selected');
        } else if (userAnswer === 'False') {
            falseOption.classList.add('selected');
        }
    }

    displayMultipleChoiceAnswers(question) {
        const container = document.getElementById('answersContainer');
        container.className = `answers-container ${question.type}`;
        
        if (!question.options || question.options.length === 0) {
            container.innerHTML = '<div class="no-options">Không có lựa chọn nào</div>';
            return;
        }
        
        question.options.forEach((option, index) => {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer-option';
            
            if (question.type === 'multiple') {
                answerDiv.onclick = () => this.selectMultipleAnswer(index, option.text);
            } else {
                answerDiv.onclick = () => this.selectAnswer(index, option.text);
            }
            
            const letter = String.fromCharCode(65 + index); // A, B, C, D...
            answerDiv.innerHTML = `
                <div class="option-letter">${letter}</div>
                <span>${option.text}</span>
                ${question.type === 'multiple' ? '<i class="fas fa-square selection-icon"></i>' : ''}
            `;
            
            container.appendChild(answerDiv);
        });
        
        // Mark selected answers if exist
        const userAnswer = this.userAnswers[this.currentQuestionIndex];
        if (userAnswer) {
            if (question.type === 'multiple' && Array.isArray(userAnswer)) {
                // Multiple selection
                question.options.forEach((option, index) => {
                    if (userAnswer.includes(option.text)) {
                        const answerDiv = container.children[index];
                        answerDiv.classList.add('selected');
                        const icon = answerDiv.querySelector('.selection-icon');
                        if (icon) {
                            icon.className = 'fas fa-check-square selection-icon';
                        }
                    }
                });
            } else if (question.type === 'single') {
                // Single selection
                const selectedIndex = question.options.findIndex(opt => opt.text === userAnswer);
                if (selectedIndex >= 0) {
                    container.children[selectedIndex].classList.add('selected');
                }
            }
        }
    }

    selectAnswer(index, answerText) {
        // Remove previous selection (for single choice)
        document.querySelectorAll('.answer-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Add selection to clicked option
        event.currentTarget.classList.add('selected');
        
        // Store answer
        this.userAnswers[this.currentQuestionIndex] = answerText;
        
        this.updateNavigationButtons();
    }

    selectMultipleAnswer(index, answerText) {
        const currentAnswers = this.userAnswers[this.currentQuestionIndex] || [];
        const answerArray = Array.isArray(currentAnswers) ? currentAnswers : [];
        
        const answerDiv = event.currentTarget;
        const icon = answerDiv.querySelector('.selection-icon');
        
        if (answerArray.includes(answerText)) {
            // Remove selection
            const newAnswers = answerArray.filter(answer => answer !== answerText);
            this.userAnswers[this.currentQuestionIndex] = newAnswers.length > 0 ? newAnswers : null;
            answerDiv.classList.remove('selected');
            if (icon) {
                icon.className = 'fas fa-square selection-icon';
            }
        } else {
            // Add selection
            answerArray.push(answerText);
            this.userAnswers[this.currentQuestionIndex] = answerArray;
            answerDiv.classList.add('selected');
            if (icon) {
                icon.className = 'fas fa-check-square selection-icon';
            }
        }
        
        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        prevBtn.disabled = this.currentQuestionIndex === 0;
        
        if (this.currentQuestionIndex === this.currentQuestions.length - 1) {
            nextBtn.textContent = 'Hoàn thành';
            nextBtn.innerHTML = 'Hoàn thành <i class="fas fa-check"></i>';
        } else {
            nextBtn.innerHTML = 'Tiếp <i class="fas fa-chevron-right"></i>';
        }
    }

    updateStudyNavigationButtons() {
        const prevBtn = document.getElementById('studyPrevBtn');
        const nextBtn = document.getElementById('studyNextBtn');
        
        prevBtn.disabled = this.studyQuestionIndex === 0;
        
        if (this.studyQuestionIndex === this.studyQuestions.length - 1) {
            nextBtn.innerHTML = 'Hoàn thành <i class="fas fa-check"></i>';
        } else {
            nextBtn.innerHTML = 'Tiếp <i class="fas fa-chevron-right"></i>';
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
            this.updateProgress();
            this.updateNavigationButtons();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
            this.updateProgress();
            this.updateNavigationButtons();
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
            'Bạn có chắc chắn muốn thoát? Tiến trình sẽ không được lưu.',
            () => this.showHome()
        );
    }

    exitStudy() {
        this.studyMode = false;
        this.showHome();
    }

    finishQuiz() {
        this.stopTimer();
        const results = this.calculateResults();
        this.showResults(results);
    }

    calculateResults() {
        let correctCount = 0;
        const totalQuestions = this.currentQuestions.length;
        
        this.currentQuestions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            
            if (!userAnswer || !question.correctAnswers || question.correctAnswers.length === 0) {
                return; // Skip if no answer or no correct answers
            }
            
            if (question.type === 'multiple') {
                // For multiple choice, check if all selected answers are correct and all correct answers are selected
                if (Array.isArray(userAnswer)) {
                    const correctAnswers = question.correctAnswers;
                    const userAnswerSet = new Set(userAnswer);
                    const correctAnswerSet = new Set(correctAnswers);
                    
                    // Check if sets are equal (same answers)
                    if (userAnswerSet.size === correctAnswerSet.size && 
                        [...userAnswerSet].every(answer => correctAnswerSet.has(answer))) {
                        correctCount++;
                    }
                }
            } else {
                // For single choice and true/false
                if (question.correctAnswers.includes(userAnswer)) {
                    correctCount++;
                }
            }
        });
        
        const percentage = Math.round((correctCount / totalQuestions) * 100);
        const endTime = new Date();
        const timeSpent = Math.round((endTime - this.startTime) / 1000);
        
        return {
            correctCount,
            incorrectCount: totalQuestions - correctCount,
            totalQuestions,
            percentage,
            timeSpent
        };
    }

    showResults(results) {
        this.showScreen('resultsScreen');
        
        document.getElementById('scorePercentage').textContent = results.percentage + '%';
        document.getElementById('correctCount').textContent = results.correctCount;
        document.getElementById('incorrectCount').textContent = results.incorrectCount;
        
        const minutes = Math.floor(results.timeSpent / 60);
        const seconds = results.timeSpent % 60;
        document.getElementById('timeSpent').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Update score text based on performance
        const scoreText = document.getElementById('scoreText');
        if (results.percentage >= 90) {
            scoreText.textContent = 'Xuất sắc!';
            scoreText.style.color = '#28a745';
        } else if (results.percentage >= 70) {
            scoreText.textContent = 'Tốt!';
            scoreText.style.color = '#17a2b8';
        } else if (results.percentage >= 50) {
            scoreText.textContent = 'Đạt!';
            scoreText.style.color = '#ffc107';
        } else {
            scoreText.textContent = 'Cần cố gắng thêm!';
            scoreText.style.color = '#dc3545';
        }
    }

    reviewAnswers() {
        this.showScreen('reviewScreen');
        this.displayReview();
    }

    displayReview() {
        const container = document.getElementById('reviewContainer');
        container.innerHTML = '';
        
        this.currentQuestions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            let isCorrect = false;
            
            // Check if answer is correct based on question type
            if (userAnswer && question.correctAnswers && question.correctAnswers.length > 0) {
                if (question.type === 'multiple' && Array.isArray(userAnswer)) {
                    const userAnswerSet = new Set(userAnswer);
                    const correctAnswerSet = new Set(question.correctAnswers);
                    isCorrect = userAnswerSet.size === correctAnswerSet.size && 
                               [...userAnswerSet].every(answer => correctAnswerSet.has(answer));
                } else {
                    isCorrect = question.correctAnswers.includes(userAnswer);
                }
            }
            
            // Format user answer for display
            let userAnswerDisplay = 'Không trả lời';
            if (userAnswer) {
                if (Array.isArray(userAnswer)) {
                    userAnswerDisplay = userAnswer.join(', ');
                } else {
                    userAnswerDisplay = userAnswer;
                }
            }
            
            const reviewItem = document.createElement('div');
            reviewItem.className = `review-item ${isCorrect ? 'correct' : 'incorrect'}`;
            
            reviewItem.innerHTML = `
                <div class="review-header">
                    <h4>Câu ${index + 1}: ${isCorrect ? 'Đúng' : 'Sai'} ${question.type === 'multiple' ? '(Nhiều lựa chọn)' : ''}</h4>
                    <i class="fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                </div>
                <div class="review-question">${question.question}</div>
                <div class="review-answers">
                    <div class="user-answer">
                        <strong>Câu trả lời của bạn:</strong> ${userAnswerDisplay}
                    </div>
                    <div class="correct-answer">
                        <strong>Đáp án đúng:</strong> ${question.correctAnswers ? question.correctAnswers.join(', ') : 'Không rõ'}
                    </div>
                </div>
            `;
            
            container.appendChild(reviewItem);
        });
    }

    restartQuiz() {
        this.startQuiz();
    }

    showConfirmModal(title, message, onConfirm) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        document.getElementById('modalConfirmBtn').onclick = () => {
            this.closeModal();
            onConfirm();
        };
        document.getElementById('modal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('modal').style.display = 'none';
    }

    showMessage(title, message, type = 'info') {
        // Simple alert for now - can be enhanced with custom modal
        alert(`${title}: ${message}`);
    }

    showKeyboardShortcuts() {
        // Phương thức trống - không cần hiển thị shortcuts panel
    }

    hideKeyboardShortcuts() {
        // Phương thức trống - không cần ẩn shortcuts panel  
    }
}

// Global functions for HTML onclick handlers
let app;

function showHome() {
    app.showHome();
}

function showQuizSelection() {
    app.showQuizSelection();
}

function showStudySelection() {
    app.showStudySelection();
}

function showRandomQuizSettings() {
    app.showRandomQuizSettings();
}

function selectAllQuizzes() {
    app.selectAllQuizzes();
}

function clearAllQuizzes() {
    app.clearAllQuizzes();
}

function toggleQuizSelection(quizName) {
    app.toggleQuizSelection(quizName);
}

function proceedToSettings() {
    app.proceedToSettings();
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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new QuizApp();
}); 