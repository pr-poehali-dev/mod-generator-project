import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GeneratedMod {
  id: string;
  name: string;
  description: string;
  version: string;
  minecraftVersion: string;
  timestamp: Date;
  status: 'generating' | 'textures_generating' | 'code_generated' | 'compiling' | 'ready' | 'error';
  jarData?: string;
  textureUrl?: string;
}

const API_GENERATE = 'https://functions.poehali.dev/d4065d07-bf9d-4767-826a-f62d6677604f';
const API_COMPILE = 'https://functions.poehali.dev/e83fc933-1ba0-4643-831b-10d1fcbde988';
const API_GET_MODS = 'https://functions.poehali.dev/d58d63d9-840a-4fae-b577-1bcbced38668';
const API_GENERATE_TEXTURES = 'https://functions.poehali.dev/e46f46d8-1d76-4748-8a6b-6b6a14ea4da7';

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Привет! Я помогу тебе создать мод для Minecraft. Опиши, что должен делать твой мод, и я создам готовый JAR файл.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMods, setGeneratedMods] = useState<GeneratedMod[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadMods();
  }, []);

  const loadMods = async () => {
    const response = await fetch(API_GET_MODS);
    const data = await response.json();
    if (data.mods) {
      const mods = data.mods.map((mod: any) => ({
        id: mod.id,
        name: mod.name,
        description: mod.description,
        version: mod.version,
        minecraftVersion: mod.minecraftVersion,
        timestamp: new Date(mod.timestamp),
        status: mod.status,
        jarData: mod.fileUrl
      }));
      setGeneratedMods(mods);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userPrompt = input;
    setInput('');
    setIsGenerating(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Отлично! Начинаю генерацию мода через ИИ...\n\n🎨 Создаю текстуры через DALL-E 3\n🔄 Генерирую Java код с помощью GPT-4\n⚙️ Создаю структуру Forge мода\n📦 Компилирую в JAR файл',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, assistantMessage]);

    const tempMod: GeneratedMod = {
      id: 'temp_' + Date.now(),
      name: userPrompt.slice(0, 30),
      description: userPrompt,
      version: '1.0.0',
      minecraftVersion: '1.20.1',
      timestamp: new Date(),
      status: 'generating'
    };
    setGeneratedMods(prev => [tempMod, ...prev]);

    try {
      setGeneratedMods(prev =>
        prev.map(mod =>
          mod.id === tempMod.id ? { ...mod, status: 'textures_generating' as const } : mod
        )
      );

      const textureResponse = await fetch(API_GENERATE_TEXTURES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mod_id: tempMod.id,
          description: userPrompt
        })
      });

      let textureUrl = '';
      if (textureResponse.ok) {
        const textureData = await textureResponse.json();
        textureUrl = textureData.texture_url || '';
        
        const textureMessage: Message = {
          id: (Date.now() + 1.5).toString(),
          role: 'assistant',
          content: '🎨 Текстуры созданы! Начинаю генерацию кода...',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, textureMessage]);
      }

      const generateResponse = await fetch(API_GENERATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          minecraft_version: '1.20.1',
          mod_name: userPrompt.slice(0, 30)
        })
      });

      const generateData = await generateResponse.json();

      if (generateData.mod_id) {
        setGeneratedMods(prev =>
          prev.map(mod =>
            mod.id === tempMod.id ? { ...mod, id: generateData.mod_id, status: 'code_generated' as const, textureUrl } : mod
          )
        );

        const codeMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: '✅ Код мода сгенерирован! Начинаю компиляцию в JAR...',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, codeMessage]);

        setGeneratedMods(prev =>
          prev.map(mod =>
            mod.id === generateData.mod_id ? { ...mod, status: 'compiling' as const } : mod
          )
        );

        const compileResponse = await fetch(API_COMPILE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mod_id: generateData.mod_id })
        });

        const compileData = await compileResponse.json();

        if (compileData.status === 'ready') {
          setGeneratedMods(prev =>
            prev.map(mod =>
              mod.id === generateData.mod_id
                ? { ...mod, status: 'ready' as const, jarData: compileData.jar_data }
                : mod
            )
          );

          const completionMessage: Message = {
            id: (Date.now() + 3).toString(),
            role: 'assistant',
            content: '🎉 Мод готов! JAR файл скомпилирован и готов к скачиванию. Переходи во вкладку "История".',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, completionMessage]);

          toast({
            title: 'Мод готов!',
            description: 'Твой мод успешно создан и готов к скачиванию.'
          });
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 4).toString(),
        role: 'assistant',
        content: '❌ Произошла ошибка при генерации мода. Попробуй ещё раз или измени описание.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);

      setGeneratedMods(prev =>
        prev.map(mod =>
          mod.id === tempMod.id ? { ...mod, status: 'error' as const } : mod
        )
      );

      toast({
        title: 'Ошибка',
        description: 'Не удалось создать мод. Попробуй ещё раз.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (mod: GeneratedMod) => {
    if (!mod.jarData) return;

    const byteCharacters = atob(mod.jarData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/java-archive' });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mod.name.replace(/\s+/g, '_')}.jar`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: 'Скачивание началось',
      description: `${mod.name}.jar загружается...`
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'generating':
        return (
          <Badge variant="secondary" className="gap-1">
            <Icon name="Loader2" size={12} className="animate-spin" />
            Генерация...
          </Badge>
        );
      case 'textures_generating':
        return (
          <Badge variant="secondary" className="gap-1">
            <Icon name="Palette" size={12} className="animate-pulse" />
            Создаю текстуры...
          </Badge>
        );
      case 'code_generated':
        return (
          <Badge variant="secondary" className="gap-1">
            <Icon name="Code2" size={12} />
            Код готов
          </Badge>
        );
      case 'compiling':
        return (
          <Badge variant="secondary" className="gap-1">
            <Icon name="Loader2" size={12} className="animate-spin" />
            Компиляция JAR...
          </Badge>
        );
      case 'ready':
        return (
          <Badge className="gap-1 bg-green-500/20 text-green-400 border-green-500/30">
            <Icon name="CheckCircle2" size={12} />
            Готов
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <Icon name="XCircle" size={12} />
            Ошибка
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Hammer" size={24} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ModCraft AI</h1>
              <p className="text-sm text-muted-foreground">Генератор модов для Minecraft</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="generator" className="gap-2">
              <Icon name="Sparkles" size={16} />
              Генератор
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Icon name="Clock" size={16} />
              История
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-6">
            <Card className="max-w-4xl mx-auto p-6 bg-card/50 backdrop-blur-sm border-border">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 animate-fade-in ${
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === 'user'
                            ? 'bg-primary'
                            : 'bg-muted'
                        }`}
                      >
                        <Icon
                          name={message.role === 'user' ? 'User' : 'Bot'}
                          size={16}
                          className={message.role === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'}
                        />
                      </div>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        <span className="text-xs opacity-70 mt-2 block">
                          {message.timestamp.toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex gap-3 animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Icon name="Bot" size={16} className="text-muted-foreground" />
                      </div>
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex gap-2 mt-6">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Опиши свой мод: добавь новые блоки, мобов, инструменты..."
                  className="flex-1 bg-background border-border"
                  disabled={isGenerating}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isGenerating || !input.trim()}
                  className="gap-2"
                >
                  <Icon name="Send" size={16} />
                  Создать
                </Button>
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => setInput('Добавь алмазный меч с двойным уроном')}
                >
                  Новое оружие
                </Badge>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => setInput('Создай магические блоки с эффектами зелий')}
                >
                  Магические блоки
                </Badge>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => setInput('Добавь нового враждебного моба с уникальными атаками')}
                >
                  Новый моб
                </Badge>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => setInput('Создай новое измерение с уникальными биомами')}
                >
                  Измерение
                </Badge>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {generatedMods.length === 0 ? (
                <Card className="p-12 text-center bg-card/50 backdrop-blur-sm">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="Package" size={32} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Пока нет созданных модов</h3>
                  <p className="text-muted-foreground">
                    Перейди во вкладку "Генератор" и создай свой первый мод
                  </p>
                </Card>
              ) : (
                generatedMods.map((mod) => (
                  <Card
                    key={mod.id}
                    className="p-6 bg-card/50 backdrop-blur-sm border-border hover:border-primary transition-all hover:shadow-lg hover:shadow-primary/20 animate-fade-in"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {mod.textureUrl && (
                        <div className="w-16 h-16 flex-shrink-0">
                          <img 
                            src={mod.textureUrl} 
                            alt={mod.name}
                            className="w-full h-full object-cover rounded-lg border-2 border-primary/30"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium">{mod.name}</h3>
                          {getStatusBadge(mod.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {mod.description}
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Icon name="Tag" size={12} />
                            Версия {mod.version}
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="Gamepad2" size={12} />
                            Minecraft {mod.minecraftVersion}
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="Calendar" size={12} />
                            {mod.timestamp.toLocaleDateString('ru-RU')}
                          </span>
                          {mod.textureUrl && (
                            <span className="flex items-center gap-1 text-primary">
                              <Icon name="Palette" size={12} />
                              С текстурами
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(mod)}
                        disabled={mod.status !== 'ready'}
                        className="gap-2"
                      >
                        <Icon name="Download" size={16} />
                        Скачать JAR
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Icon name="Zap" size={16} />
            <span>Powered by OpenAI GPT-4 + DALL-E 3</span>
          </div>
          <p>Генерация текстур через ИИ • Поддержка всех версий Minecraft • Генерация Java кода • Полная компиляция JAR</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;