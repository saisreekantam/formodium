import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Star, ChevronDown, ChevronUp, MessageCircle, X, Send } from 'lucide-react';

const GiftRecommendations = ({ recommendations: initialRecommendations = [], onSelectGift }) => {
    const navigate = useNavigate();
    const [expandedCategories, setExpandedCategories] = useState([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [allRecommendations, setAllRecommendations] = useState([]);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (Array.isArray(initialRecommendations)) {
            setAllRecommendations(initialRecommendations);
            // Expand first category by default if there are recommendations
            if (initialRecommendations.length > 0) {
                const firstCategory = initialRecommendations[0]?.category;
                if (firstCategory) {
                    setExpandedCategories([firstCategory]);
                }
            }
        } else {
            console.warn('Invalid recommendations format');
            setAllRecommendations([]);
        }
    }, [initialRecommendations]);

    const getGroupedRecommendations = () => {
        if (!Array.isArray(allRecommendations)) return {};
        
        return allRecommendations.reduce((acc, gift) => {
            const category = gift.category || 'Other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(gift);
            return acc;
        }, {});
    };

    const groupedRecommendations = getGroupedRecommendations();

    const toggleCategory = (category) => {
        setExpandedCategories(prev => 
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const getCategoryIcon = (category) => {
        const icons = {
            'Technology': '💻',
            'Fashion': '👔',
            'Home': '🏠',
            'Books': '📚',
            'Sports': '⚽',
            'Art': '🎨',
            'Music': '🎵',
            'Gaming': '🎮',
            'Food': '🍳',
            'Wellness': '🧘‍♂️',
            'default': '🎁'
        };
        return icons[category] || icons.default;
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMessage = {
            type: 'user',
            content: inputMessage
        };
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8000/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage.content
                }),
            });

            const data = await response.json();
            
            setMessages(prev => [...prev, {
                type: 'bot',
                content: data.response
            }]);

            // Handle new recommendations if present
            const responseText = data.response;
            if (responseText.includes("Here are some gifts that might interest you:")) {
                const recommendationLines = responseText.split('\n');
                const newRecommendations = [];
                
                for (let i = 0; i < recommendationLines.length; i++) {
                    const line = recommendationLines[i];
                    if (line.match(/^\d+\./)) {
                        const [name, price] = line.split(' - $');
                        const description = recommendationLines[i + 1]?.trim();
                        const category = recommendationLines[i + 2]?.includes('Category:') 
                            ? recommendationLines[i + 2].split('Category:')[1].trim()
                            : 'Other';
                        
                        if (name && price) {
                            newRecommendations.push({
                                id: `chat-${Date.now()}-${i}`,
                                name: name.replace(/^\d+\.\s*/, '').trim(),
                                price: parseFloat(price),
                                description: description?.replace(/Description:\s*/, '') || '',
                                category: category,
                                score: 0.95
                            });
                        }
                    }
                }

                if (newRecommendations.length > 0) {
                    setAllRecommendations(prev => {
                        const existing = new Set(prev.map(r => r.name));
                        const uniqueNew = newRecommendations.filter(r => !existing.has(r.name));
                        return [...prev, ...uniqueNew];
                    });

                    newRecommendations.forEach(rec => {
                        if (rec.category && !expandedCategories.includes(rec.category)) {
                            setExpandedCategories(prev => [...prev, rec.category]);
                        }
                    });
                }
            }

        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                type: 'bot',
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Show empty state if no recommendations
    if (Object.keys(groupedRecommendations).length === 0) {
        return (
            <div className="max-w-6xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-8 text-center">
                    <Gift className="h-8 w-8 text-blue-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No Recommendations Available</h2>
                    <p className="text-gray-600">Try asking our gift assistant for personalized recommendations!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative max-w-6xl mx-auto px-4">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <div className="flex items-center justify-center mb-6">
                    <Gift className="h-8 w-8 text-blue-500 mr-2" />
                    <h2 className="text-2xl font-bold text-gray-900">Your Personalized Gift Recommendations</h2>
                </div>
                
                <div className="space-y-6">
                    {Object.entries(groupedRecommendations).map(([category, gifts]) => (
                        <div key={category} className="border rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleCategory(category)}
                                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                            >
                                <div className="flex items-center">
                                    <span className="text-2xl mr-3">{getCategoryIcon(category)}</span>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {category}
                                    </h3>
                                    <span className="ml-2 text-sm text-gray-500">
                                        ({gifts.length} items)
                                    </span>
                                </div>
                                {expandedCategories.includes(category) ? 
                                    <ChevronUp className="h-5 w-5 text-gray-500" /> : 
                                    <ChevronDown className="h-5 w-5 text-gray-500" />
                                }
                            </button>
                            
                            {expandedCategories.includes(category) && (
                                <div className="p-6 bg-white">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {gifts.map((gift) => (
                                            <div 
                                                key={gift.id}
                                                className="border rounded-lg hover:shadow-md transition-shadow"
                                            >
                                                <div className="p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="text-lg font-medium text-gray-900">{gift.name}</h4>
                                                        <div className="flex items-center">
                                                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                                            <span className="ml-1 text-sm text-gray-600">
                                                                {((gift.score || 0.8) * 5).toFixed(1)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-600 text-sm mb-4">{gift.description}</p>
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-green-600">${gift.price}</span>
                                                        <button
                                                            onClick={() => {
                                                                onSelectGift(gift);
                                                                navigate('/shipping');
                                                            }}
                                                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                                        >
                                                            Select Gift
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chatbot */}
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg"
                >
                    {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
                </button>

                {isChatOpen && (
                    <div className="absolute bottom-16 right-0 w-96 h-[500px] bg-white rounded-lg shadow-xl flex flex-col">
                        <div className="p-4 bg-blue-500 text-white rounded-t-lg">
                            <h3 className="text-lg font-semibold">Gift Assistant</h3>
                            <p className="text-sm opacity-90">Ask me about gift recommendations!</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`mb-4 flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`p-3 rounded-lg max-w-[80%] ${
                                            message.type === 'user'
                                                ? 'bg-blue-500 text-white rounded-br-none'
                                                : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                        }`}
                                    >
                                        {message.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start mb-4">
                                    <div className="bg-gray-100 text-gray-800 p-3 rounded-lg rounded-bl-none">
                                        <div className="flex space-x-2">
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Ask about gift recommendations..."
                                    className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isLoading}
                                    className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GiftRecommendations;