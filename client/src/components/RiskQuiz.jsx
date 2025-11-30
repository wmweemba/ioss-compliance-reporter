import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle, Mail, ArrowRight, ArrowLeft } from 'lucide-react'

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Email validation schema using Zod
 */
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address').min(1, 'Email is required')
})

/**
 * Quiz questions configuration
 */
const QUIZ_QUESTIONS = [
  {
    id: "origin",
    question: "Where do you ship your products from?",
    options: [
      { label: "Outside the EU (e.g., China, USA, UK)", value: "non_eu" },
      { label: "Inside the EU", value: "eu" }
    ]
  },
  {
    id: "destination",
    question: "Where are your customers located?",
    options: [
      { label: "Mostly EU Countries", value: "eu" },
      { label: "Global / Mixed", value: "global" }
    ]
  },
  {
    id: "aov",
    question: "What is your Average Order Value (AOV)?",
    options: [
      { label: "Under €150", value: "under_150" },
      { label: "Over €150", value: "over_150" }
    ]
  },
  {
    id: "ioss_status",
    question: "Do you have an IOSS (Import One-Stop Shop) Number?",
    options: [
      { label: "Yes, I have one", value: "yes" },
      { label: "No", value: "no" },
      { label: "What is IOSS?", value: "unknown" }
    ]
  }
]

/**
 * Risk assessment scenarios
 */
const RISK_SCENARIOS = [
  {
    condition: (answers) => 
      answers.origin === 'non_eu' && 
      answers.destination === 'eu' && 
      (answers.ioss_status === 'no' || answers.ioss_status === 'unknown'),
    result: "CRITICAL_RISK",
    headline: "⚠️ CRITICAL RISK: Your packages are likely to be stopped.",
    description: "Without IOSS, your EU customers will be hit with surprise VAT fees and handling charges upon delivery. This causes high rejection rates and Stripe disputes.",
    icon: AlertTriangle,
    iconColor: "text-destructive",
    bgColor: "bg-destructive/10 border-destructive/20"
  },
  {
    condition: (answers) => 
      answers.origin === 'non_eu' && 
      answers.destination === 'eu' && 
      answers.ioss_status === 'yes',
    result: "MODERATE_RISK",
    headline: "⚠️ COMPLIANCE GAP: Are you filing your monthly reports?",
    description: "You have the number, but do you have the data? If you don't file the monthly IOSS report correctly, you face audits and fines.",
    icon: AlertTriangle,
    iconColor: "text-yellow-600 dark:text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
  }
]

const DEFAULT_SCENARIO = {
  result: "LOW_RISK",
  headline: "✅ LOOKS GOOD: You appear to be safe.",
  description: "Based on your shipping profile, you do not currently have significant IOSS exposure.",
  icon: CheckCircle,
  iconColor: "text-green-600 dark:text-green-500",
  bgColor: "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700"
}

/**
 * EU VAT Risk Quiz Component
 * 
 * A multi-step quiz that assesses IOSS compliance risk for dropshippers
 * and captures emails for high-risk users.
 * 
 * @component
 */
export default function RiskQuiz() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)
  const [emailSubmitted, setEmailSubmitted] = useState(false)

  /**
   * Form handling with React Hook Form and Zod validation
   */
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    resolver: zodResolver(emailSchema)
  })

  /**
   * Calculate risk assessment based on user answers
   * @param {Object} userAnswers - User's quiz answers
   * @returns {Object} Risk scenario object
   */
  const calculateRisk = (userAnswers) => {
    for (const scenario of RISK_SCENARIOS) {
      if (scenario.condition(userAnswers)) {
        return scenario
      }
    }
    return DEFAULT_SCENARIO
  }

  /**
   * Handle answer selection for current question
   * @param {string} value - Selected answer value
   */
  const handleAnswer = (value) => {
    const questionId = QUIZ_QUESTIONS[currentStep].id
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)

    // Auto-advance to next question or show results
    setTimeout(() => {
      if (currentStep < QUIZ_QUESTIONS.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        setShowResults(true)
      }
    }, 300)
  }

  /**
   * Handle email form submission
   * @param {Object} data - Form data with email
   */
  const onEmailSubmit = async (data) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success("Thanks! You've been added to our beta list.", {
        description: "We'll contact you soon with your IOSS compliance solution."
      })
      
      setEmailSubmitted(true)
      reset()
    } catch (error) {
      toast.error("Something went wrong. Please try again.")
    }
  }

  /**
   * Reset quiz to initial state
   */
  const resetQuiz = () => {
    setCurrentStep(0)
    setAnswers({})
    setShowResults(false)
    setEmailSubmitted(false)
  }

  /**
   * Navigate to previous question
   */
  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentQuestion = QUIZ_QUESTIONS[currentStep]
  const riskAssessment = showResults ? calculateRisk(answers) : null
  const progress = ((currentStep + 1) / QUIZ_QUESTIONS.length) * 100
  const RiskIcon = riskAssessment?.icon

  if (showResults) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <h1 className="text-2xl font-bold text-foreground">
                Your IOSS Risk Assessment
              </h1>
              <p className="text-muted-foreground">
                Based on your shipping profile
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Risk Result */}
              <div className={cn(
                "p-6 rounded-lg border-2 transition-all",
                riskAssessment.bgColor
              )}>
                <div className="flex items-start space-x-4">
                  <RiskIcon className={cn("w-6 h-6 mt-1 flex-shrink-0", riskAssessment.iconColor)} />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {riskAssessment.headline}
                    </h3>
                    <p className="text-muted-foreground">
                      {riskAssessment.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Capture Form - Only show for risk cases */}
              {(riskAssessment.result === 'CRITICAL_RISK' || riskAssessment.result === 'MODERATE_RISK') && !emailSubmitted && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Get Your IOSS Compliance Solution
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Join our beta to auto-generate your IOSS reports and stay compliant
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          className={cn(
                            "pl-10",
                            errors.email && "border-destructive focus:border-destructive"
                          )}
                          {...register('email')}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Joining Beta...' : 'Join the Beta →'}
                    </Button>
                  </form>
                </div>
              )}

              {/* Success Message */}
              {emailSubmitted && (
                <div className="text-center space-y-4 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                      You're All Set!
                    </h3>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      We'll be in touch soon with your IOSS compliance solution.
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-center">
                <Button variant="outline" onClick={resetQuiz}>
                  Take Quiz Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              EU VAT Risk Assessment
            </h1>
            <p className="text-muted-foreground">
              Find out if you need IOSS registration
            </p>
            
            {/* Progress Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Question {currentStep + 1} of {QUIZ_QUESTIONS.length}</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Question */}
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left h-auto p-4 transition-all hover:bg-muted/50",
                    answers[currentQuestion.id] === option.value && 
                    "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                  onClick={() => handleAnswer(option.value)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 transition-colors",
                      answers[currentQuestion.id] === option.value 
                        ? "border-primary bg-primary" 
                        : "border-muted-foreground"
                    )}>
                      {answers[currentQuestion.id] === option.value && (
                        <div className="w-full h-full rounded-full bg-background scale-50" />
                      )}
                    </div>
                    <span className="text-sm">{option.label}</span>
                  </div>
                </Button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={goBack}
                disabled={currentStep === 0}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              
              <Button 
                variant="ghost"
                disabled={!answers[currentQuestion.id]}
                className="flex items-center space-x-2 text-muted-foreground"
              >
                <span>
                  {currentStep < QUIZ_QUESTIONS.length - 1 ? 'Next' : 'Results'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>This assessment helps identify IOSS compliance requirements for EU sales</p>
        </div>
      </div>
    </div>
  )
}