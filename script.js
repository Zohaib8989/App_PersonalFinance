document.addEventListener('DOMContentLoaded', function() {
    const transactionForm = document.getElementById('transaction-form');
    const transactionsTable = document.getElementById('transactions-table').getElementsByTagName('tbody')[0];
    const csvFileInput = document.getElementById('csvFileInput');
    const uploadCsvButton = document.getElementById('uploadCsvButton');

    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let monthlyIncomeExpenseChart, expenseByCategoryChart;

    // Populate the table with existing transactions
    transactions.forEach(addTransactionToTable);
    updateCharts();

    transactionForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const type = document.getElementById('type').value;
        const date = document.getElementById('date').value;
        const payee = document.getElementById('payee').value;
        const category = document.getElementById('category').value;
        const subcategory = document.getElementById('subcategory').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const account = document.getElementById('account').value;
        const description = document.getElementById('description').value;

        if (!type || !date || !payee || !category || !subcategory || isNaN(amount) || !account) {
            console.error('One or more fields are empty or invalid.');
            return;
        }

        const transaction = { id: Date.now(), type, date, payee, category, subcategory, amount, account, description };

        transactions.push(transaction);
        localStorage.setItem('transactions', JSON.stringify(transactions));

        addTransactionToTable(transaction);
        updateCharts();

        // Reset the form fields
        transactionForm.reset();
    });

    uploadCsvButton.addEventListener('click', () => {
        const file = csvFileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const text = e.target.result;
                parseCsv(text);
            };
            reader.readAsText(file);
        }
    });

    function parseCsv(text) {
        const rows = text.split('\n');
        rows.forEach(row => {
            const columns = row.split(',');
            if (columns.length >= 8) {
                const [type, date, payee, category, subcategory, amount, account, description] = columns;
                const transaction = {
                    id: Date.now(),
                    type: type.trim(),
                    date: date.trim(),
                    payee: payee.trim(),
                    category: category.trim(),
                    subcategory: subcategory.trim(),
                    amount: parseFloat(amount.trim()),
                    account: account.trim(),
                    description: description.trim()
                };
                if (transaction.type && transaction.date && transaction.payee && transaction.category && !isNaN(transaction.amount) && transaction.account) {
                    transactions.push(transaction);
                    addTransactionToTable(transaction);
                }
            }
        });
        console.log('Transactions after CSV import:', transactions); // Debugging log
        localStorage.setItem('transactions', JSON.stringify(transactions));
        updateCharts();
    }

    function addTransactionToTable(transaction) {
        console.log('Adding transaction to table:', transaction); // Debugging log
        const newRow = transactionsTable.insertRow();
        newRow.dataset.id = transaction.id;

        newRow.insertCell(0).textContent = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
        newRow.insertCell(1).textContent = formatDate(transaction.date);
        newRow.insertCell(2).textContent = transaction.payee;
        newRow.insertCell(3).textContent = transaction.category;
        newRow.insertCell(4).textContent = transaction.subcategory;
        newRow.insertCell(5).textContent = formatAmount(transaction.amount);
        newRow.insertCell(6).textContent = transaction.account;
        newRow.insertCell(7).textContent = transaction.description;
        const deleteCell = newRow.insertCell(8);
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '🗑️';
        deleteButton.addEventListener('click', () => deleteTransaction(transaction.id));
        deleteCell.appendChild(deleteButton);
    }

    function deleteTransaction(id) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        const rowToDelete = transactionsTable.querySelector(`tr[data-id='${id}']`);
        rowToDelete.remove();
        updateCharts();
    }

    function updateCharts() {
        console.log('Updating charts with transactions:', transactions); // Debugging log

        if (transactions.length === 0) {
            // If there are no transactions, clear the charts
            if (monthlyIncomeExpenseChart) {
                monthlyIncomeExpenseChart.destroy();
                monthlyIncomeExpenseChart = null;
            }
            if (expenseByCategoryChart) {
                expenseByCategoryChart.destroy();
                expenseByCategoryChart = null;
            }
            return;
        }

        const monthlyData = getMonthlyData(transactions);
        const expenseByCategoryData = getExpenseByCategoryData(transactions);

        console.log('Monthly data for chart:', monthlyData); // Debugging log
        console.log('Expense by category data for chart:', expenseByCategoryData); // Debugging log

        const ctx2 = document.getElementById('monthlyIncomeExpenseChart').getContext('2d');
        if (monthlyIncomeExpenseChart) {
            monthlyIncomeExpenseChart.destroy();
        }
        monthlyIncomeExpenseChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [
                    {
                        label: 'Income',
                        data: monthlyData.income,
                        backgroundColor: '#4caf50'
                    },
                    {
                        label: 'Expenses',
                        data: monthlyData.expenses,
                        backgroundColor: '#f44336'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Month'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Amount'
                        },
                        beginAtZero: true
                    }
                }
            }
        });

        const ctx3 = document.getElementById('expenseByCategoryChart').getContext('2d');
        if (expenseByCategoryChart) {
            expenseByCategoryChart.destroy();
        }
        expenseByCategoryChart = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: expenseByCategoryData.labels,
                datasets: [{
                    label: 'Expenses by Category',
                    data: expenseByCategoryData.data,
                    backgroundColor: '#f44336'
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Amount'
                        },
                        beginAtZero: true
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Category'
                        }
                    }
                }
            }
        });
    }

    function formatAmount(amount) {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-GB', options).replace(/ /g, '-');
    }

    function getMonthlyData(transactions) {
        const monthlyData = {};
        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const month = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expenses: 0 };
            }
            if (transaction.type === 'income') {
                monthlyData[month].income += transaction.amount;
            } else if (transaction.type === 'expense') {
                monthlyData[month].expenses += transaction.amount;
            }
        });

        const labels = Object.keys(monthlyData).sort((a, b) => new Date(a) - new Date(b));
        const income = labels.map(month => monthlyData[month].income);
        const expenses = labels.map(month => monthlyData[month].expenses);

        return { labels, income, expenses };
    }

    function getExpenseByCategoryData(transactions) {
        const categoryData = {};
        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                if (!categoryData[transaction.category]) {
                    categoryData[transaction.category] = 0;
                }
                categoryData[transaction.category] += transaction.amount;
            }
        });

        const sortedCategoryData = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);
        const labels = sortedCategoryData.map(entry => entry[0]);
        const data = sortedCategoryData.map(entry => entry[1]);

        return { labels, data };
    }
});
