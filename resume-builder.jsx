import React, { useState, useEffect } from 'react';

export default function ResumeBuilder() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [animationComplete, setAnimationComplete] = useState(false);
  
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {currentScreen === 'landing' ? (
        <LandingScreen 
          onStart={() => setCurrentScreen('builder')}
          animationComplete={animationComplete}
          setAnimationComplete={setAnimationComplete}
        />
      ) : (
        <BuilderScreen onBack={() => setCurrentScreen('landing')} />
      )}
    </div>
  );
}

function LandingScreen({ onStart, animationComplete, setAnimationComplete }) {
  const [builderText, setBuilderText] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  const [isBlue, setIsBlue] = useState(false);
  const [isBold, setIsBold] = useState(false);
  
  useEffect(() => {
    const timer1 = setTimeout(() => {
      setShowCursor(true);
      let currentText = '';
      const builderWord = ' Builder';
      let index = 0;
      
      const typingInterval = setInterval(() => {
        if (index < builderWord.length) {
          currentText += builderWord[index];
          setBuilderText(currentText);
          index++;
        } else {
          clearInterval(typingInterval);
          setTimeout(() => {
            setIsBold(true);
            setTimeout(() => {
              setIsBlue(true);
              setAnimationComplete(true);
            }, 300);
          }, 300);
        }
      }, 100);
    }, 1000);
    
    return () => clearTimeout(timer1);
  }, [setAnimationComplete]);
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'white',
      padding: '20px'
    }}>
      <h1 style={{
        fontSize: 'clamp(36px, 10vw, 72px)',
        fontWeight: isBold ? 'bold' : 'normal',
        color: isBlue ? '#2563eb' : '#000',
        marginBottom: '40px',
        fontFamily: 'Arial, sans-serif',
        transition: 'all 0.3s ease',
        whiteSpace: 'nowrap',
        textAlign: 'center'
      }}>
        <span>Resume</span>
        <span>{builderText}</span>
        {showCursor && <span style={{ animation: 'blink 1s infinite', marginLeft: '2px' }}>|</span>}
      </h1>

      {animationComplete && (
        <button
          onClick={onStart}
          style={{
            fontSize: 'clamp(18px, 4vw, 24px)',
            padding: '16px 48px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
        >
          Start
        </button>
      )}

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function BuilderScreen({ onBack }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [skills, setSkills] = useState('');
  
  const [summaryHistory, setSummaryHistory] = useState([]);
  const [experienceHistory, setExperienceHistory] = useState([]);
  const [educationHistory, setEducationHistory] = useState([]);
  const [skillsHistory, setSkillsHistory] = useState([]);
  
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [activeSection, setActiveSection] = useState('personal');
  
  const [resume, setResume] = useState(null);

  useEffect(() => {
    if (firstName || lastName) {
      setResume({
        name: `${firstName} ${lastName}`.trim(),
        contact: [email, phone, location].filter(Boolean).join(' | '),
        summary,
        experience,
        education,
        skills
      });
    } else {
      setResume(null);
    }
  }, [firstName, lastName, email, phone, location, summary, experience, education, skills]);

  const sections = [
    { id: 'personal', label: 'Personal', next: 'summary' },
    { id: 'summary', label: 'Summary', next: 'experience' },
    { id: 'experience', label: 'Experience', next: 'education' },
    { id: 'education', label: 'Education', next: 'skills' },
    { id: 'skills', label: 'Skills', next: 'customize' },
    { id: 'customize', label: 'Style', next: null }
  ];

  const goNext = () => {
    const current = sections.find(s => s.id === activeSection);
    if (current && current.next) {
      setActiveSection(current.next);
    }
  };

  const rewriteWithAI = async (text, field, setter, history, setHistory) => {
    setHistory([...history, text]);
    
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY_HERE', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Rewrite this resume ${field} professionally and make it ATS-friendly. Keep the same info but make it compelling:\n\n${text}` }]
          }]
        })
      });

      const data = await response.json();
      const rewritten = data.candidates[0].content.parts[0].text;
      setter(rewritten);
    } catch (error) {
      alert('Add your FREE Gemini API key! See FREE_AI_SETUP.md');
      setHistory(history);
    }
  };

  const undo = (history, setHistory, setter) => {
    if (history.length > 0) {
      setter(history[history.length - 1]);
      setHistory(history.slice(0, -1));
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1400px', 
      margin: '0 auto',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px'
      }}>
        <h2 style={{ fontSize: '24px', margin: 0 }}>Resume Builder</h2>
        <button onClick={onBack} style={{
          padding: '10px 20px',
          backgroundColor: '#f1f5f9',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600'
        }}>
          ← Back
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', padding: '10px', backgroundColor: 'white', borderRadius: '12px' }}>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              padding: '10px 20px',
              backgroundColor: activeSection === s.id ? primaryColor : 'white',
              color: activeSection === s.id ? 'white' : '#64748b',
              border: '2px solid ' + (activeSection === s.id ? primaryColor : '#e2e8f0'),
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '20px' 
      }}>
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px' }}>
          
          {activeSection === 'personal' && (
            <div>
              <h3 style={{ marginBottom: '20px' }}>👤 Personal Information</h3>
              <div style={{ display: 'grid', gap: '15px' }}>
                <InputField label="First Name *" value={firstName} onChange={setFirstName} />
                <InputField label="Last Name *" value={lastName} onChange={setLastName} />
                <InputField label="Email *" value={email} onChange={setEmail} type="email" />
                <InputField label="Phone *" value={phone} onChange={setPhone} type="tel" />
                <InputField label="Location" value={location} onChange={setLocation} />
              </div>
              <NextButton onClick={goNext} label="Next: Summary" />
            </div>
          )}

          {activeSection === 'summary' && (
            <div>
              <h3 style={{ marginBottom: '10px' }}>📝 Professional Summary</h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>
                Brief overview of your background (2-3 sentences)
              </p>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Example: Results-driven engineer with 5+ years experience..."
                style={{ width: '100%', minHeight: '120px', padding: '12px', fontSize: '14px', border: '2px solid #e2e8f0', borderRadius: '8px', resize: 'vertical' }}
              />
              <AIButtons
                text={summary}
                onRewrite={() => rewriteWithAI(summary, 'summary', setSummary, summaryHistory, setSummaryHistory)}
                onUndo={() => undo(summaryHistory, setSummaryHistory, setSummary)}
                hasHistory={summaryHistory.length > 0}
              />
              <NextButton onClick={goNext} label="Next: Experience" />
            </div>
          )}

          {activeSection === 'experience' && (
            <div>
              <h3 style={{ marginBottom: '10px' }}>💼 Work Experience</h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>
                List your jobs, achievements, and responsibilities
              </p>
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Software Engineer at Tech Co (2020-2023)&#10;• Built mobile app with 1M users&#10;• Led team of 5 developers"
                style={{ width: '100%', minHeight: '180px', padding: '12px', fontSize: '14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontFamily: 'monospace', resize: 'vertical' }}
              />
              <AIButtons
                text={experience}
                onRewrite={() => rewriteWithAI(experience, 'experience', setExperience, experienceHistory, setExperienceHistory)}
                onUndo={() => undo(experienceHistory, setExperienceHistory, setExperience)}
                hasHistory={experienceHistory.length > 0}
              />
              <NextButton onClick={goNext} label="Next: Education" />
            </div>
          )}

          {activeSection === 'education' && (
            <div>
              <h3 style={{ marginBottom: '10px' }}>🎓 Education</h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>
                Your degrees and academic achievements
              </p>
              <textarea
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="Bachelor of Science in Computer Science&#10;State University, 2018&#10;GPA: 3.8/4.0"
                style={{ width: '100%', minHeight: '140px', padding: '12px', fontSize: '14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontFamily: 'monospace', resize: 'vertical' }}
              />
              <AIButtons
                text={education}
                onRewrite={() => rewriteWithAI(education, 'education', setEducation, educationHistory, setEducationHistory)}
                onUndo={() => undo(educationHistory, setEducationHistory, setEducation)}
                hasHistory={educationHistory.length > 0}
              />
              <NextButton onClick={goNext} label="Next: Skills" />
            </div>
          )}

          {activeSection === 'skills' && (
            <div>
              <h3 style={{ marginBottom: '10px' }}>⚡ Skills</h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>
                Technical skills, tools, frameworks
              </p>
              <textarea
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="JavaScript, React, Python, AWS, Docker, Git"
                style={{ width: '100%', minHeight: '100px', padding: '12px', fontSize: '14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontFamily: 'monospace', resize: 'vertical' }}
              />
              <AIButtons
                text={skills}
                onRewrite={() => rewriteWithAI(skills, 'skills', setSkills, skillsHistory, setSkillsHistory)}
                onUndo={() => undo(skillsHistory, setSkillsHistory, setSkills)}
                hasHistory={skillsHistory.length > 0}
              />
              <NextButton onClick={goNext} label="Next: Customize Style" />
            </div>
          )}

          {activeSection === 'customize' && (
            <div>
              <h3 style={{ marginBottom: '20px' }}>🎨 Color Theme</h3>
              
              <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '10px' }}>
                Pick Your Color
              </label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{
                  width: '100%',
                  height: '100px',
                  border: '3px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  marginBottom: '15px'
                }}
              />
              
              <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                Or Enter Hex Code
              </label>
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#2563eb"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontFamily: 'monospace'
                }}
              />
              
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '2px solid #bae6fd' }}>
                <p style={{ fontSize: '13px', color: '#0369a1', margin: 0 }}>
                  💡 Your color will appear in the section headers on your resume
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Preview - ALWAYS VISIBLE */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', position: 'sticky', top: '20px', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #f1f5f9' }}>
            📄 Live Preview
          </h3>
            
            {resume && resume.name ? (
              <div>
                <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '5px' }}>{resume.name}</h1>
                {resume.contact && <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>{resume.contact}</p>}
                
                {resume.summary && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: primaryColor, marginBottom: '8px' }}>Summary</h3>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{resume.summary}</p>
                  </div>
                )}
                
                {resume.experience && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: primaryColor, marginBottom: '8px' }}>Experience</h3>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{resume.experience}</p>
                  </div>
                )}
                
                {resume.education && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: primaryColor, marginBottom: '8px' }}>Education</h3>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{resume.education}</p>
                  </div>
                )}
                
                {resume.skills && (
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: primaryColor, marginBottom: '8px' }}>Skills</h3>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{resume.skills}</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', paddingTop: '80px' }}>
                <p style={{ fontSize: '40px', marginBottom: '10px' }}>📝</p>
                <p style={{ fontSize: '16px', fontWeight: '600' }}>Your resume will appear here</p>
                <p style={{ fontSize: '14px', marginTop: '5px' }}>Start by entering your name ✨</p>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: '15px',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          outline: 'none'
        }}
      />
    </div>
  );
}

function AIButtons({ text, onRewrite, onUndo, hasHistory }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
      <button
        onClick={onRewrite}
        disabled={!text}
        style={{
          flex: 1,
          padding: '12px',
          backgroundColor: text ? '#8b5cf6' : '#d1d5db',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: text ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          fontWeight: '600'
        }}
      >
        ✨ AI Rewrite
      </button>
      
      {hasHistory && (
        <button
          onClick={onUndo}
          style={{
            padding: '12px 20px',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          ↶ Undo
        </button>
      )}
    </div>
  );
}

function NextButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        marginTop: '20px',
        padding: '14px',
        backgroundColor: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '600'
      }}
    >
      {label} →
    </button>
  );
}
