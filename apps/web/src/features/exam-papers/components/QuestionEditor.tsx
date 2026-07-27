'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextField } from './RichTextField';
import { ImageCropModal } from './ImageCropModal';
import { api } from '@/services/api-client';

interface QuestionEditorProps {
  sections: any[];
  onSubmit: (sections: any[], styling: { fontFamily: string; fontSize: string; color: string }) => void;
  onSaveDraft: (sections: any[], styling: { fontFamily: string; fontSize: string; color: string }) => void;
  onBack?: () => void;
  initialStyling?: { fontFamily: string; fontSize: string; color: string };
}

export function QuestionEditor({ sections, onSubmit, onSaveDraft, onBack, initialStyling }: QuestionEditorProps) {
  const [draftSections, setDraftSections] = useState(sections);
  const [globalStyle, setGlobalStyle] = useState(initialStyling || {
    fontFamily: 'Times New Roman',
    fontSize: '11pt',
    color: '#000000'
  });
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<{ src: string; sectionIndex: number; questionIndex: number } | null>(null);

  useEffect(() => {
    // Initialize questions from segments if they don't exist
    const initializedSections = sections.map(section => {
      if (section.segments && section.segments.length > 0 && (!section.questions || section.questions.length === 0)) {
        const allQuestions = section.segments.flatMap((segment: any, segIndex: number) => {
          // For MATCHING type, create only 1 question with all pairs
          if (segment.type === 'MATCHING') {
            return [{
              id: `${section.label}-${segIndex}-0`,
              questionText: '',
              options: [],
              imageUrl: '',
              segmentType: segment.type,
              segmentLabel: segment.label,
              order: 0,
              matchingPairs: Array.from({ length: segment.questionCount }, () => ({ left: '', right: '' })),
            }];
          }
          // For other types, create questionCount questions
          return Array.from({ length: segment.questionCount }, (_, qIndex) => ({
            id: `${section.label}-${segIndex}-${qIndex}`,
            questionText: '',
            options: segment.type === 'MCQ' ? Array.from({ length: 4 }, (_, i) => ({ text: '', isCorrect: i === 0 })) : [],
            imageUrl: '',
            segmentType: segment.type,
            segmentLabel: segment.label,
            order: qIndex,
          }));
        });
        return {
          ...section,
          questions: allQuestions,
        };
      }
      // Ensure existing questions have segmentType for MCQ detection and are sorted by order
      if (section.questions) {
        const questionsWithSegmentType = section.questions.map((q: any) => ({
          ...q,
          segmentType: q.segmentType || section.type,
        }));
        // Sort questions by order field to prevent shuffling
        const sortedQuestions = questionsWithSegmentType.sort((a: any, b: any) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          return orderA - orderB;
        });
        return {
          ...section,
          questions: sortedQuestions,
        };
      }
      return section;
    });
    setDraftSections(initializedSections);
  }, [sections]);

  const updateQuestion = (sectionIndex: number, questionIndex: number, patch: any) => {
    const next = [...draftSections];
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((question: any, index: number) => index === questionIndex ? { ...question, ...patch } : question),
    };
    setDraftSections(next);
  };

  const updateAlternative = (sectionIndex: number, questionIndex: number, alternativeIndex: number, patch: any) => {
    const next = [...draftSections];
    const question = next[sectionIndex].questions[questionIndex];
    const alternatives = question.alternatives || [];
    alternatives[alternativeIndex] = { ...alternatives[alternativeIndex], ...patch };
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((q: any, index: number) => 
        index === questionIndex ? { ...q, alternatives } : q
      ),
    };
    setDraftSections(next);
  };

  const addAlternative = (sectionIndex: number, questionIndex: number) => {
    const next = [...draftSections];
    const question = next[sectionIndex].questions[questionIndex];
    const alternatives = question.alternatives || [];
    const baseQuestion = {
      questionText: '',
      options: question.segmentType === 'MCQ' ? Array.from({ length: 4 }, (_, i) => ({ text: '', isCorrect: i === 0 })) : [],
      imageUrl: '',
      segmentType: question.segmentType,
      segmentLabel: question.segmentLabel,
    };
    alternatives.push(baseQuestion);
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((q: any, index: number) => 
        index === questionIndex ? { ...q, alternatives } : q
      ),
    };
    setDraftSections(next);
  };

  const removeAlternative = (sectionIndex: number, questionIndex: number, alternativeIndex: number) => {
    const next = [...draftSections];
    const question = next[sectionIndex].questions[questionIndex];
    const alternatives = question.alternatives || [];
    alternatives.splice(alternativeIndex, 1);
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((q: any, index: number) => 
        index === questionIndex ? { ...q, alternatives } : q
      ),
    };
    setDraftSections(next);
  };

  const updateAlternativeOption = (sectionIndex: number, questionIndex: number, alternativeIndex: number, optionIndex: number, value: string) => {
    const next = [...draftSections];
    const question = next[sectionIndex].questions[questionIndex];
    const alternatives = question.alternatives || [];
    const currentOptions = alternatives[alternativeIndex].options || [];
    const updatedOptions = [...currentOptions];
    if (optionIndex < updatedOptions.length) {
      updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], text: value };
    } else {
      updatedOptions.push({ text: value, isCorrect: optionIndex === 0 });
    }
    alternatives[alternativeIndex] = { ...alternatives[alternativeIndex], options: updatedOptions };
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((q: any, index: number) => 
        index === questionIndex ? { ...q, alternatives } : q
      ),
    };
    setDraftSections(next);
  };

  const updateMatchingPair = (sectionIndex: number, questionIndex: number, pairIndex: number, side: 'left' | 'right', value: string) => {
    const next = [...draftSections];
    const question = next[sectionIndex].questions[questionIndex];
    const matchingPairs = question.matchingPairs || Array.from({ length: 5 }, () => ({ left: '', right: '' }));
    matchingPairs[pairIndex] = { ...matchingPairs[pairIndex], [side]: value };
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((q: any, index: number) => 
        index === questionIndex ? { ...q, matchingPairs } : q
      ),
    };
    setDraftSections(next);
  };

  const updateOption = (sectionIndex: number, questionIndex: number, optionIndex: number, value: string) => {
    const next = [...draftSections];
    const currentOptions = next[sectionIndex].questions[questionIndex].options || [];
    const updatedOptions = [...currentOptions];
    if (optionIndex < updatedOptions.length) {
      updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], text: value };
    } else {
      updatedOptions.push({ text: value, isCorrect: optionIndex === 0 });
    }
    next[sectionIndex] = {
      ...next[sectionIndex],
      questions: next[sectionIndex].questions.map((question: any, index: number) => index === questionIndex ? { ...question, options: updatedOptions } : question),
    };
    setDraftSections(next);
  };

  const handleImageUpload = async (sectionIndex: number, questionIndex: number, file: File) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentImage({
          src: reader.result as string,
          sectionIndex,
          questionIndex
        });
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to read image:', error);
      alert('Failed to read image. Please try again.');
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    if (!currentImage) return;
    
    try {
      // Convert base64 to blob for upload
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('image', blob, 'cropped-image.png');
      
      const uploadResponse = await api.postFormData<{ imageUrl: string }>('/exam-papers/upload-question-image', formData);
      updateQuestion(currentImage.sectionIndex, currentImage.questionIndex, { imageUrl: uploadResponse.imageUrl });
    } catch (error) {
      console.error('Failed to upload cropped image:', error);
      alert('Failed to upload cropped image. Please try again.');
    }
  };

  const handleSaveDraft = () => {
    onSaveDraft(draftSections, globalStyle);
  };

  const validateSections = () => {
    for (let sectionIndex = 0; sectionIndex < draftSections.length; sectionIndex++) {
      const section = draftSections[sectionIndex];
      if (!section.questions) continue;
      
      for (let questionIndex = 0; questionIndex < section.questions.length; questionIndex++) {
        const question = section.questions[questionIndex];
        const alternatives = question.alternatives || [];
        
        // Skip validation for MATCHING questions - they have matching pairs instead of question text
        if (question.segmentType === 'MATCHING') {
          continue;
        }
        
        // Check if at least one alternative (main question or any alternative) has text
        const hasValidAlternative = question.questionText?.trim() !== '' || 
          alternatives.some((alt: any) => alt.questionText?.trim() !== '');
        
        if (!hasValidAlternative) {
          return false;
        }
        
        // Check MCQ options for main question if it has text
        if (question.questionText?.trim() !== '' && question.segmentType === 'MCQ') {
          const options = question.options || [];
          if (options.length < 4 || options.some((opt: any) => !opt.text || opt.text.trim() === '')) {
            return false;
          }
        }
        
        // Check MCQ options for alternatives that have text
        alternatives.forEach((alt: any) => {
          if (alt.questionText?.trim() !== '' && alt.segmentType === 'MCQ') {
            const altOptions = alt.options || [];
            if (altOptions.length < 4 || altOptions.some((opt: any) => !opt.text || opt.text.trim() === '')) {
              return false;
            }
          }
        });
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateSections()) {
      alert('Please fill in all mandatory fields (question text and MCQ options). Image URL is optional.');
      return;
    }
    onSubmit(draftSections, globalStyle);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Global Toolbar for text styling */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl items-center">
        <span className="text-sm font-semibold text-gray-700">Apply to All Questions:</span>
        <div className="flex gap-2 items-center">
          <Label className="text-xs">Font:</Label>
          <select 
            className="border border-gray-300 rounded p-1 text-sm bg-white"
            value={globalStyle.fontFamily}
            onChange={(e) => setGlobalStyle({...globalStyle, fontFamily: e.target.value})}
          >
            <optgroup label="Theme Fonts">
              <option value="Calibri Light">Calibri Light</option>
              <option value="Calibri">Calibri</option>
            </optgroup>
            <optgroup label="Recently Used">
              <option value="Times New Roman">Times New Roman</option>
              <option value="Cambria">Cambria</option>
            </optgroup>
            <optgroup label="All Fonts">
              <option value="Agency FB">Agency FB</option>
              <option value="Arial">Arial</option>
              <option value="Arial Black">Arial Black</option>
              <option value="Bahnschrift">Bahnschrift</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
            </optgroup>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <Label className="text-xs">Size:</Label>
          <select 
            className="border border-gray-300 rounded p-1 text-sm bg-white w-16"
            value={globalStyle.fontSize}
            onChange={(e) => setGlobalStyle({...globalStyle, fontSize: e.target.value})}
          >
            <option value="10pt">10</option>
            <option value="11pt">11</option>
            <option value="12pt">12</option>
            <option value="14pt">14</option>
            <option value="16pt">16</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <Label className="text-xs">Color:</Label>
          <input 
            type="color" 
            value={globalStyle.color}
            onChange={(e) => setGlobalStyle({...globalStyle, color: e.target.value})}
            className="h-8 w-8 cursor-pointer border-0 p-0 bg-transparent rounded"
          />
        </div>
      </div>

      <div style={{ fontFamily: globalStyle.fontFamily, fontSize: globalStyle.fontSize, color: globalStyle.color }}>
        {draftSections.map((section, sectionIndex) => (
          <div key={`${section.label}-${sectionIndex}`} className="space-y-3 rounded-xl border border-gray-100 p-4 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800" style={{ fontFamily: 'sans-serif' }}>{section.label}</h3>
              <span className="text-sm text-gray-500" style={{ fontFamily: 'sans-serif' }}>{section.questions.length} questions</span>
            </div>
            {section.questions.map((question: any, questionIndex: number) => {
              const alternatives = question.alternatives || [];
              const hasAlternatives = alternatives.length > 0;
              
              return (
                <div key={question.id || `${sectionIndex}-${questionIndex}`} className="rounded-lg border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Label style={{ fontFamily: 'sans-serif' }}>Question {question.order !== undefined ? question.order + 1 : questionIndex + 1}</Label>
                      {question.segmentLabel && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium" style={{ fontFamily: 'sans-serif' }}>
                          {question.segmentLabel}
                        </span>
                      )}
                      {hasAlternatives && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium" style={{ fontFamily: 'sans-serif' }}>
                          Internal Choice ({alternatives.length + 1} options)
                        </span>
                      )}
                    </div>
                    {question.segmentType !== 'MATCHING' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addAlternative(sectionIndex, questionIndex)}
                        className="text-xs"
                      >
                        + Add Alternative
                      </Button>
                    )}
                  </div>

                  {/* Main Question */}
                  {question.segmentType === 'MATCHING' ? (
                    <div className="mt-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-semibold mb-2 block" style={{ fontFamily: 'sans-serif' }}>Column A</Label>
                          <div className="space-y-2">
                            {(question.matchingPairs || []).map((pair: any, pairIndex: number) => (
                              <Input
                                key={`left-${pairIndex}`}
                                placeholder={`Item ${pairIndex + 1}`}
                                value={pair.left || ''}
                                onChange={(e) => updateMatchingPair(sectionIndex, questionIndex, pairIndex, 'left', e.target.value)}
                                style={{ fontFamily: globalStyle.fontFamily, fontSize: globalStyle.fontSize, color: globalStyle.color }}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold mb-2 block" style={{ fontFamily: 'sans-serif' }}>Column B</Label>
                          <div className="space-y-2">
                            {(question.matchingPairs || []).map((pair: any, pairIndex: number) => (
                              <Input
                                key={`right-${pairIndex}`}
                                placeholder={`Match ${pairIndex + 1}`}
                                value={pair.right || ''}
                                onChange={(e) => updateMatchingPair(sectionIndex, questionIndex, pairIndex, 'right', e.target.value)}
                                style={{ fontFamily: globalStyle.fontFamily, fontSize: globalStyle.fontSize, color: globalStyle.color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-2" style={{ color: globalStyle.color }}>
                        <RichTextField 
                          value={question.questionText || ''} 
                          onChange={(value) => updateQuestion(sectionIndex, questionIndex, { questionText: value })} 
                          required
                        />
                        {(!question.questionText || question.questionText.trim() === '') && !hasAlternatives && (
                          <p className="text-xs text-red-500 mt-1" style={{ fontFamily: 'sans-serif' }}>Question text is required</p>
                        )}
                      </div>

                      {question.segmentType === 'MCQ' ? (
                        <div className="mt-3 space-y-2">
                          {Array.from({ length: 4 }).map((_, optionIndex) => (
                            <div key={optionIndex}>
                              <Input 
                                placeholder={`Option ${optionIndex + 1}`} 
                                value={question.options?.[optionIndex]?.text || ''}
                                onChange={(e) => updateOption(sectionIndex, questionIndex, optionIndex, e.target.value)} 
                                style={{ fontFamily: globalStyle.fontFamily, fontSize: globalStyle.fontSize, color: globalStyle.color }}
                                required
                              />
                              {(!question.options?.[optionIndex]?.text || question.options[optionIndex].text.trim() === '') && question.questionText?.trim() !== '' && (
                                <p className="text-xs text-red-500 mt-1" style={{ fontFamily: 'sans-serif' }}>Option {optionIndex + 1} is required</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}

                  {question.segmentType !== 'MATCHING' && (
                    <>
                      <div className="mt-3">
                        <Label style={{ fontFamily: 'sans-serif' }}>Image (optional)</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(sectionIndex, questionIndex, file);
                              }
                            }}
                            style={{ fontFamily: 'sans-serif', fontSize: '0.875rem' }}
                            className="flex-1"
                          />
                          <span className="text-xs text-gray-500 self-center">or</span>
                          <Input 
                            value={question.imageUrl || ''} 
                            onChange={(e) => updateQuestion(sectionIndex, questionIndex, { imageUrl: e.target.value })} 
                            style={{ fontFamily: 'sans-serif', fontSize: '0.875rem' }}
                            placeholder="https://example.com/image.png"
                            className="flex-1"
                          />
                        </div>
                        {question.imageUrl && (
                          <div className="mt-2">
                            <img 
                              src={question.imageUrl} 
                              alt="Question preview" 
                              className="max-w-full h-auto max-h-32 rounded border border-gray-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label style={{ fontFamily: 'sans-serif' }}>Subject / Topic (optional)</Label>
                          <Input 
                            value={question.subject || ''} 
                            onChange={(e) => updateQuestion(sectionIndex, questionIndex, { subject: e.target.value })} 
                            style={{ fontFamily: 'sans-serif', fontSize: '0.875rem' }}
                            placeholder="e.g. Algebra, Calculus"
                          />
                        </div>
                        <div>
                          <Label style={{ fontFamily: 'sans-serif' }}>Hint (optional)</Label>
                          <Input 
                            value={question.hint || ''} 
                            onChange={(e) => updateQuestion(sectionIndex, questionIndex, { hint: e.target.value })} 
                            style={{ fontFamily: 'sans-serif', fontSize: '0.875rem' }}
                            placeholder="e.g. Use formula x²"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Alternative Questions */}
                  {alternatives.map((alt: any, altIndex: number) => (
                    <div key={altIndex} className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-purple-700" style={{ fontFamily: 'sans-serif' }}>OR</span>
                          <span className="text-xs text-gray-500" style={{ fontFamily: 'sans-serif' }}>Alternative {altIndex + 1}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAlternative(sectionIndex, questionIndex, altIndex)}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                      
                      <div className="mt-2" style={{ color: globalStyle.color }}>
                        <RichTextField 
                          value={alt.questionText || ''} 
                          onChange={(value) => updateAlternative(sectionIndex, questionIndex, altIndex, { questionText: value })} 
                          required
                        />
                        {(!alt.questionText || alt.questionText.trim() === '') && (
                          <p className="text-xs text-red-500 mt-1" style={{ fontFamily: 'sans-serif' }}>Alternative question text is required</p>
                        )}
                      </div>

                      {alt.segmentType === 'MCQ' ? (
                        <div className="mt-3 space-y-2">
                          {Array.from({ length: 4 }).map((_, optionIndex) => (
                            <div key={optionIndex}>
                              <Input 
                                placeholder={`Option ${optionIndex + 1}`} 
                                value={alt.options?.[optionIndex]?.text || ''}
                                onChange={(e) => updateAlternativeOption(sectionIndex, questionIndex, altIndex, optionIndex, e.target.value)} 
                                style={{ fontFamily: globalStyle.fontFamily, fontSize: globalStyle.fontSize, color: globalStyle.color }}
                                required
                              />
                              {(!alt.options?.[optionIndex]?.text || alt.options[optionIndex].text.trim() === '') && alt.questionText?.trim() !== '' && (
                                <p className="text-xs text-red-500 mt-1" style={{ fontFamily: 'sans-serif' }}>Option {optionIndex + 1} is required</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-3">
                        <Label style={{ fontFamily: 'sans-serif' }}>Image (optional)</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(sectionIndex, questionIndex, file);
                              }
                            }}
                            style={{ fontFamily: 'sans-serif', fontSize: '0.875rem' }}
                            className="flex-1"
                          />
                          <span className="text-xs text-gray-500 self-center">or</span>
                          <Input 
                            value={alt.imageUrl || ''} 
                            onChange={(e) => updateAlternative(sectionIndex, questionIndex, altIndex, { imageUrl: e.target.value })} 
                            style={{ fontFamily: 'sans-serif', fontSize: '0.875rem' }}
                            placeholder="https://example.com/image.png"
                            className="flex-1"
                          />
                        </div>
                        {alt.imageUrl && (
                          <div className="mt-2">
                            <img 
                              src={alt.imageUrl} 
                              alt="Alternative question preview" 
                              className="max-w-full h-auto max-h-32 rounded border border-gray-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label style={{ fontFamily: 'sans-serif' }}>Subject / Topic (optional)</Label>
                          <Input 
                            value={alt.subject || ''} 
                            onChange={(e) => updateAlternative(sectionIndex, questionIndex, altIndex, { subject: e.target.value })} 
                            style={{ fontFamily: 'sans-serif', fontSize: '0.875rem' }}
                            placeholder="e.g. Algebra, Calculus"
                          />
                        </div>
                        <div>
                          <Label style={{ fontFamily: 'sans-serif' }}>Hint (optional)</Label>
                          <Input 
                            value={alt.hint || ''} 
                            onChange={(e) => updateAlternative(sectionIndex, questionIndex, altIndex, { hint: e.target.value })} 
                            style={{ fontFamily: 'sans-serif', fontSize: '0.875rem' }}
                            placeholder="e.g. Use formula x²"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="flex gap-3 mt-6">
        {onBack && <Button type="button" variant="outline" onClick={onBack}>Back</Button>}
        <Button type="button" variant="outline" onClick={handleSaveDraft}>Save as Draft</Button>
        <Button type="button" onClick={handleSubmit}>Submit Paper</Button>
      </div>

      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
        imageSrc={currentImage?.src || ''}
      />
    </div>
  );
}